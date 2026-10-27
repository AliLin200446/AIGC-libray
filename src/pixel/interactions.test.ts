import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import ts from 'typescript';

// Exercise the real module with a deterministic clock, event dispatch and RAF queue.
const code = ts.transpileModule(readFileSync(new URL('./interactions.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function harness(reduced = false) {
  let now = 0, next = 0, draws = 0;
  const frames = new Map<number, (t: number) => void>();
  class Element extends EventTarget {
    style = {}; dataset = {}; isConnected = true; blocked = false; family = '';
    classList = { remove() {}, add() {} };
    closest(selector: string): unknown {
      if (selector === '[data-ff-family]') return this.family ? { dataset: { ffFamily: this.family } } : null;
      if (selector.includes('.instrument-control') && this.family) return this;
      return selector.includes('data-ff-no-trail') && this.blocked ? this : null;
    }
    setAttribute() {}
    remove() { this.isConnected = false; }
    getContext() { return context; }
  }
  const context = { setTransform() {}, clearRect() {}, fillRect() { draws++; }, beginPath() {}, arc() {}, stroke() { draws++; }, fill() { draws++; } };
  const canvas = new Element(), blank = new Element(), window = new Element();
  const reduce = Object.assign(new Element(), { matches: reduced });
  Object.assign(window, { matchMedia: () => reduce, innerWidth: 1000, innerHeight: 700, devicePixelRatio: 1, getSelection: () => null });
  const document = Object.assign(new Element(), { hidden: false, documentElement: new Element(), body: { appendChild() {} }, createElement: () => canvas });
  const exports = {} as { initPixelInteractions: () => () => void };
  runInNewContext(code, { exports, window, document, Element,
    getComputedStyle: () => ({ getPropertyValue: (name: string) => name }), performance: { now: () => now },
    requestAnimationFrame: (fn: (t: number) => void) => { frames.set(++next, fn); return next; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  });
  const dispose = exports.initPixelInteractions();
  function pointer(type: string, x = 200, pointerType = 'mouse', target = blank) {
    const event = new Event(type);
    Object.defineProperties(event, Object.fromEntries(Object.entries({ target, clientX: x, clientY: 200, pointerType, pointerId: 1, isPrimary: true, buttons: 0 }).map(([key, value]) => [key, { value }])));
    window.dispatchEvent(event);
  }
  function advance(ms: number) { for (const end = now + ms; now < end;) { now += 16; const jobs = [...frames.values()]; frames.clear(); jobs.forEach(fn => fn(now)); } }
  return { frames, pointer, advance, dispose, canvas, blank, document, window, reduce, get draws() { return draws; } };
}

test('pixel RAF sleeps after pointer rests, including on blank ground', () => {
  const h = harness(); h.pointer('pointermove'); h.pointer('pointermove', 300);
  assert(h.frames.size > 0); h.advance(2000); assert.equal(h.frames.size, 0);
  const count = h.draws; h.advance(1000); assert.equal(h.draws, count); h.dispose();
});
test('content does not spawn particles or wake', () => {
  const h = harness(); h.blank.blocked = true; h.pointer('pointermove'); h.pointer('pointermove', 500);
  h.advance(2000); assert.equal(h.draws, 0); assert.equal(h.frames.size, 0); h.dispose();
});
test('touch burst requires a tap, not drag, cancellation or a long press', () => {
  const h = harness();
  h.pointer('pointerdown', 200, 'touch'); h.pointer('pointermove', 300, 'touch'); h.pointer('pointerup', 200, 'touch'); assert.equal(h.frames.size, 0);
  h.pointer('pointerdown', 200, 'touch'); h.pointer('pointercancel', 200, 'touch'); h.pointer('pointerup', 200, 'touch'); assert.equal(h.frames.size, 0);
  h.pointer('pointerdown', 200, 'touch'); h.advance(600); h.pointer('pointerup', 200, 'touch'); assert.equal(h.frames.size, 0);
  h.pointer('pointerdown', 200, 'touch'); h.pointer('pointerup', 200, 'touch'); assert(h.frames.size > 0); h.advance(2000); assert(h.draws > 0); assert.equal(h.frames.size, 0); h.dispose();
});
test('reduced motion cancels active effects and starts idle', () => {
  const h = harness(); h.pointer('pointermove'); h.pointer('pointermove', 300);
  h.reduce.matches = true; h.reduce.dispatchEvent(new Event('change')); assert.equal(h.frames.size, 0);
  h.pointer('pointermove', 400); h.pointer('pointerdown', 200, 'touch'); h.pointer('pointerup', 200, 'touch'); assert.equal(h.frames.size, 0); h.dispose();
  const initial = harness(true); initial.pointer('pointermove'); assert.equal(initial.frames.size, 0); initial.dispose();
});
test('hidden pages, blur and scrolling discard stale effects; disposal removes listeners', () => {
  const h = harness();
  for (const action of ['visibilitychange', 'blur', 'scroll']) {
    h.pointer('pointermove', 200); h.pointer('pointermove', 300); assert(h.frames.size > 0);
    if (action === 'visibilitychange') { h.document.hidden = true; h.document.dispatchEvent(new Event(action)); } else h.window.dispatchEvent(new Event(action));
    assert.equal(h.frames.size, 0); h.document.hidden = false; h.advance(2000); assert.equal(h.frames.size, 0);
  }
  h.dispose(); h.pointer('pointermove', 400); assert.equal(h.frames.size, 0); assert.equal(h.canvas.isConnected, false);
});

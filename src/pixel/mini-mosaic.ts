/**
 * Framefield — mini mosaic for control-page headings (R1)
 * A 28×12 pixel loop next to the title, one scene per control, driven by the
 * page's live configuration (direction, angle, focal length, intersection…).
 * 4 stepped phases; earlier phases stay behind as sparse pink dither.
 * Tones: camera = blue, subject = pink ring, guides = green, frame = ink.
 */
import { paintCells, type CellTone } from './mosaic-heading';
import type { ParamValues } from '../controls/control-model';

export const MINI_COLS = 28;
export const MINI_ROWS = 12;
const PHASES = 4;

type Cell = { tone: CellTone; d: number; size?: number } | null;
type Hit = (x: number, y: number) => boolean;

const cross = (cx: number, cy: number): Hit => {
  const rx = Math.round(cx), ry = Math.round(cy);
  return (x, y) => (y === ry && Math.abs(x - rx) <= 1) || (x === rx && Math.abs(y - ry) <= 1);
};
const ring = (cx: number, cy: number, r = 2.2): Hit => (x, y) => {
  const d = Math.hypot(x - cx, y - cy);
  return (d <= r && d >= r - 0.9) || d < 0.6;
};
const wedge = (cx: number, cy: number, deg: number, half: number, len = 30): Hit => (x, y) => {
  const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
  if (dist < 1.5 || dist > len) return false;
  let a = (Math.atan2(dy, dx) * 180) / Math.PI - deg;
  a = ((a + 540) % 360) - 180;
  return Math.abs(a) <= half;
};
const frameEdge: Hit = (x, y) =>
  ((y === 0 || y === MINI_ROWS - 1) && x >= 4 && x <= 23 && x % 2 === 0) ||
  ((x === 4 || x === 23) && y % 2 === 0);
const inFrame = (x: number, y: number) => x > 4 && x < 23 && y > 0 && y < MINI_ROWS - 1;

/** Step t ∈ (0..1] for phase p. */
const t = (p: number) => (p + 1) / PHASES;

/**
 * Build the cell function for one control at one phase.
 * Layers are listed back → front; the front-most hit decides the cell.
 */
type Layer = { hit: Hit; tone: CellTone; d: number; size?: number };
function layersFor(slug: string, v: ParamValues, phase: number): Layer[] {
  const ghosts = (make: (p: number) => Hit, tone: CellTone = 'lens') =>
    Array.from({ length: phase }, (_, p) => ({ hit: make(p), tone, d: 0.18 + 0.14 * p }));

  switch (slug) {
    case 'pan': {
      const sign = v.direction === 'right' ? 1 : -1;
      const a = Math.min(Number(v.angle), 70);
      const dir = (p: number) => -90 + sign * a * t(p);
      return [
        ...ghosts((p) => wedge(14, 11, dir(p), 7)),
        { hit: wedge(14, 11, dir(phase), 7), tone: 'camera', d: 0.6 },
        { hit: cross(14, 11), tone: 'camera', d: 1 },
      ];
    }
    case 'tilt': {
      const up = v.direction !== 'down';
      const cy = up ? 8 : 3;
      const a = Math.min(Number(v.angle), 40) * (up ? -1 : 1);
      return [
        { hit: (x, y) => y === MINI_ROWS - 1 && x % 2 === 0, tone: 'ink', d: 1, size: 0.3 },
        ...ghosts((p) => wedge(3, cy, a * t(p), 7)),
        { hit: wedge(3, cy, a * t(phase), 7), tone: 'camera', d: 0.6 },
        { hit: cross(3, cy), tone: 'camera', d: 1 },
      ];
    }
    case 'dolly': {
      const travel = Math.min(Number(v.distance), 20) / 20 * 12 + 4;   // cells
      const inward = v.direction !== 'out';
      const x0 = inward ? 3 : 3 + travel, x1 = inward ? 3 + travel : 3;
      const at = (p: number) => x0 + (x1 - x0) * t(p);
      return [
        { hit: (x, y) => y === 6 && x > 2 && x < 23 && x % 2 === 0, tone: 'camera', d: 1, size: 0.3 },
        { hit: ring(24, 6), tone: 'lens', d: 1 },
        ...ghosts((p) => cross(at(p), 6)),
        { hit: cross(at(phase), 6), tone: 'camera', d: 1 },
      ];
    }
    case 'orbit': {
      const sign = v.direction === 'counterclockwise' ? -1 : 1;
      const arc = (Math.min(Number(v.arc), 300) * Math.PI) / 180;
      const pos = (p: number) => {
        const a = Math.PI / 2 + sign * arc * t(p);   // start at the bottom of the ellipse
        return [14 + Math.cos(a) * 11, 6 + Math.sin(a) * 5] as const;
      };
      return [
        { hit: (x, y) => Math.abs(Math.hypot((x - 14) / 11, (y - 6) / 5) - 1) < 0.1, tone: 'lens', d: 1, size: 0.3 },
        { hit: ring(14, 6), tone: 'lens', d: 1 },
        ...ghosts((p) => { const [x, y] = pos(p); return cross(x, y); }),
        { hit: ((): Hit => { const [x, y] = pos(phase); return cross(x, y); })(), tone: 'camera', d: 1 },
      ];
    }
    case 'centered':
    case 'rule-of-thirds': {
      const target:[number,number] = slug === 'centered'
        ? [14, 6]
        : ({ 'upper-left': [10, 4], 'upper-right': [17, 4], 'lower-left': [10, 8], 'lower-right': [17, 8] } as Record<string, [number,number]>)[String(v.intersection)] ?? [17, 4];
      const start:[number,number] = [7, 9];
      const at = (p: number):[number,number] => [start[0] + (target[0] - start[0]) * t(p), start[1] + (target[1] - start[1]) * t(p)];
      const guides: Hit = slug === 'centered'
        ? (x, y) => x === 14 && inFrame(x, y) && y % 2 === 1
        : (x, y) => inFrame(x, y) && (((x === 10 || x === 17) && y % 2 === 1) || ((y === 4 || y === 8) && x % 2 === 1));
      return [
        { hit: frameEdge, tone: 'ink', d: 1, size: 0.3 },
        { hit: guides, tone: 'composition', d: 1, size: phase >= 1 ? 0.6 : 0.35 },
        ...ghosts((p) => { const [x, y] = at(p); return ring(x, y, 1.6); }),
        { hit: ((): Hit => { const [x, y] = at(phase); return ring(x, y); })(), tone: 'lens', d: 1 },
      ];
    }
    case 'symmetrical': {
      const vertical = v.axis !== 'horizontal';
      const axis: Hit = vertical ? (x, y) => x === 14 && inFrame(x, y) && y % 2 === 1 : (x, y) => y === 6 && inFrame(x, y) && x % 2 === 1;
      const block = (x0: number, y0: number, w: number, h: number): Hit => (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
      const left = vertical ? block(7, 3, 3, 6) : block(10, 2, 8, 2);
      const right = vertical ? block(18, 3, 3, 6) : block(10, 8, 8, 2);
      return [
        { hit: frameEdge, tone: 'ink', d: 1, size: 0.3 },
        { hit: axis, tone: 'composition', d: 1, size: 0.6 },
        { hit: left, tone: 'composition', d: phase >= 0 ? 0.6 : 0 },
        { hit: right, tone: 'composition', d: [0, 0.2, 0.4, 0.6][phase]! },
        { hit: ring(14, 6, 1.8), tone: 'lens', d: 1 },
      ];
    }
    case 'negative-space': {
      const side = String(v.side);
      const share = Math.min(Number(v['area-fraction']), 0.7) * t(phase);
      const quiet: Hit = (x, y) => {
        if (!inFrame(x, y)) return false;
        const fx = (x - 5) / 17, fy = (y - 1) / 9;
        return side === 'left' ? fx < share : side === 'right' ? fx > 1 - share : side === 'top' ? fy < share : fy > 1 - share;
      };
      const subj:[number,number] = ({ left: [19, 6], right: [8, 6], top: [14, 8], bottom: [14, 3] } as Record<string, [number, number]>)[side] ?? [19, 6];
      return [
        { hit: frameEdge, tone: 'ink', d: 1, size: 0.3 },
        { hit: quiet, tone: 'composition', d: 0.22 },
        { hit: ring(subj[0], subj[1]), tone: 'lens', d: 1 },
      ];
    }
    default: {
      // lens-<f>mm: field of view narrows/widens from the baseline to this focal length
      const f = Number(/lens-(\d+)mm/.exec(slug)?.[1] ?? 50);
      const base = Number(v['baseline-focal-length'] ?? 50);
      const half = (mm: number) => Math.min(42, (Math.atan(18 / mm) * 180) / Math.PI);
      const at = (p: number) => half(base) + (half(f) - half(base)) * t(p);
      return [
        ...ghosts((p) => wedge(14, 11, -90, at(p))),
        { hit: wedge(14, 11, -90, at(phase)), tone: 'camera', d: 0.55 },
        { hit: cross(14, 11), tone: 'camera', d: 1 },
      ];
    }
  }
}

export function miniCellAt(slug: string, v: ParamValues, phase: number): (x: number, y: number) => Cell {
  const layers = layersFor(slug, v, phase % PHASES);
  return (x, y) => {
    for (let i = layers.length - 1; i >= 0; i--) {const layer=layers[i]!;if(layer.hit(x,y))return {tone:layer.tone,d:layer.d,...(layer.size!==undefined?{size:layer.size}:{})};}
    return null;
  };
}

/**
 * Mount next to a heading. `get` returns the live slug + values; call `update()`
 * after the configuration changes. Stepped loop, paused off-screen and under reduced motion.
 */
export function mountMiniMosaic(el: HTMLElement, get: () => { slug: string; values: ParamValues }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ff-mini-mosaic';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  el.appendChild(canvas);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let phase = PHASES - 1, timer = 0, visible = false;
  const draw = () => { const { slug, values } = get(); paintCells(canvas, MINI_COLS, MINI_ROWS, miniCellAt(slug, values, phase)); };
  const start = () => {
    window.clearInterval(timer);
    if (reduce.matches) { phase = PHASES - 1; draw(); return; }   // still frame = the full move
    if (visible && !document.hidden) timer = window.setInterval(() => { phase = (phase + 1) % PHASES; draw(); }, 520);
  };
  const ro = new ResizeObserver(draw); ro.observe(el);
  const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; start(); }); io.observe(el);
  reduce.addEventListener?.('change', start);document.addEventListener('visibilitychange',start);
  draw(); start();

  return {
    update: draw,
    dispose() {
      window.clearInterval(timer); ro.disconnect(); io.disconnect();
      reduce.removeEventListener?.('change', start);document.removeEventListener('visibilitychange',start); canvas.remove();
    },
  };
}

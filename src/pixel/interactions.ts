/**
 * Framefield — pixel interactions (R1)
 *
 * Obvious:  pixel fall — moving over empty ground sheds family-colored pixels
 *           that drop, bounce once at the bottom edge and step-fade out.
 * Subtle:   dot wake      — grid dots near the cursor resolve into ink pixels
 *           reticle       — camera-blue cross + normalized x/y readout inside the viewport
 *           stamp         — pressing a control stamps a ring of its family's module
 *           tick lift     — lens-ruler ticks near the pointer rise by one cell
 *           (numeral cell-in + bracket tighten + nav underline build live in CSS)
 *
 * Deterministic on purpose: the module and color under a grid cell are a
 * function of that cell, so the same spot always sheds the same pixel.
 * One fixed canvas, pointer-events:none; the RAF loop sleeps when idle.
 */

type Kind = 'square' | 'ring' | 'checker' | 'cross';
type Family = 'lens' | 'composition' | 'camera' | 'failure';

export interface PixelFxOptions {
  trail?: boolean;
  wake?: boolean;
  reticle?: boolean;
  stamp?: boolean;
  tickLift?: boolean;
  /** Elements under which the trail never starts (in addition to the defaults). */
  blockSelector?: string;
  /** Hard cap on live particles. */
  maxParticles?: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  size: number; kind: Kind; color: string;
  age: number; life: number; gravity: boolean; bounced: boolean;
}

const GRID = 24;               // must match --ff-dot-step
const CELL = 4;                // must match --ff-cell
const SPAWN_EVERY = 14;        // px of pointer travel per pixel
const WAKE_R = 96;

const DEFAULT_BLOCK = [
  'a', 'button', 'input', 'select', 'textarea', 'label', 'summary',
  '[role="button"]', '[role="slider"]', '[role="tab"]', '[contenteditable]',
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'li', 'dt', 'dd', 'figcaption', 'blockquote', 'pre', 'code', 'table',
  'img', 'svg', 'video', 'canvas', 'figure',
  '.instrument-viewport', '.lens-instrument', '.compose-workspace', '.compose-tools',
  '.instrument-header', '.archive-header', '.instrument-footer',
  '[data-ff-no-trail]',
].join(',');

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    ink: v('--ff-ink', '#141514'),
    lens: v('--ff-lens', '#d6338a'),
    composition: v('--ff-composition', '#0f8a5f'),
    camera: v('--ff-camera', '#1f6fd6'),
    failure: v('--ff-failure', '#e2492f'),
  };
}

/** Cheap integer hash → stable per grid cell. */
function cellHash(gx: number, gy: number) {
  let h = (gx * 374761393 + gy * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

const FAMILY_KIND: Record<Family, Kind> = {
  lens: 'ring', composition: 'checker', camera: 'cross', failure: 'square',
};

export function initPixelInteractions(opts: PixelFxOptions = {}): () => void {
  const o = {
    trail: true, wake: true, reticle: true, stamp: true, tickLift: true,
    maxParticles: 180, ...opts,
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const block = o.blockSelector ? `${DEFAULT_BLOCK},${o.blockSelector}` : DEFAULT_BLOCK;
  let pal = readPalette();

  /* ---------- canvas ---------- */
  const canvas = document.createElement('canvas');
  canvas.className = 'ff-fx-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  let dpr = 1, W = 0, H = 0;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  };
  resize();

  /* ---------- state ---------- */
  const parts: Particle[] = [];
  let px = -1, py = -1, travel = 0;
  let overBlank = false;
  let wake = 0;                 // 0..1, eased
  let raf = 0, last = 0, lastMove = -Infinity;

  const motionOK = () => !reduce.matches && !document.hidden;
  let touch: { id: number; x: number; y: number; at: number } | undefined;

  function spawn(x: number, y: number, family?: Family, burst = false) {
    if (parts.length >= o.maxParticles) parts.shift();
    const gx = Math.floor(x / GRID), gy = Math.floor(y / GRID);
    const h = cellHash(gx, gy);
    const fams: Family[] = ['lens', 'composition', 'camera', 'failure'];
    const fam = family ?? fams[h % 4]!;
    const kind = FAMILY_KIND[fam];
    const color = pal[fam];
    const size = [CELL * 2, CELL * 2, CELL * 3, CELL][(h >>> 3) % 4]!;
    const jitter = ((h >>> 6) % 100) / 100 - 0.5;
    parts.push({
      x: Math.round(x / CELL) * CELL, y: Math.round(y / CELL) * CELL,
      vx: burst ? 0 : jitter * 120,
      vy: burst ? 0 : -60 - ((h >>> 9) % 120),
      size, kind, color,
      age: 0, life: burst ? 0.34 : 1.25 + ((h >>> 12) % 40) / 100,
      gravity: !burst, bounced: false,
    });
    wakeUp();
  }

  function stampAt(x: number, y: number, family: Family) {
    // 8 modules on a 3×3 ring, one cell apart — a stamp, not a firework
    const d = CELL * 4;
    const offs = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] as const;
    offs.forEach(([dx, dy]) => {
      if (parts.length >= o.maxParticles) parts.shift();
      parts.push({
        x: Math.round((x + dx * d) / CELL) * CELL, y: Math.round((y + dy * d) / CELL) * CELL,
        vx: dx * 40, vy: dy * 40, size: CELL * 2, kind: FAMILY_KIND[family], color: pal[family],
        age: 0, life: 0.32, gravity: false, bounced: false,
      });
    });
    wakeUp();
  }

  /* ---------- drawing ---------- */
  function drawModule(p: Particle, alpha: number) {
    const s = p.size, x = Math.round(p.x / 2) * 2 - s / 2, y = Math.round(p.y / 2) * 2 - s / 2;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    switch (p.kind) {
      case 'square':
        ctx.fillRect(x, y, s, s); break;
      case 'checker': {
        const h = s / 2;
        ctx.fillRect(x, y, h, h); ctx.fillRect(x + h, y + h, h, h); break;
      }
      case 'cross': {
        const t = Math.max(2, Math.round(s / 4));
        ctx.fillRect(x + (s - t) / 2, y, t, s); ctx.fillRect(x, y + (s - t) / 2, s, t); break;
      }
      case 'ring': {
        ctx.lineWidth = Math.max(1.5, s / 8);
        ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 2 - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x + s / 2, y + s / 2, s / 5, 0, Math.PI * 2); ctx.fill(); break;
      }
    }
  }

  function drawWake() {
    if (wake < 0.02 || px < 0) return;
    ctx.fillStyle = pal.ink;
    const half = GRID / 2;
    const x0 = Math.floor((px - WAKE_R) / GRID) * GRID + half;
    const y0 = Math.floor((py - WAKE_R) / GRID) * GRID + half;
    for (let gx = x0; gx <= px + WAKE_R; gx += GRID) {
      for (let gy = y0; gy <= py + WAKE_R; gy += GRID) {
        const d = Math.hypot(gx - px, gy - py);
        if (d > WAKE_R) continue;
        // stepped falloff — 3 levels, not a smooth gradient
        const lvl = Math.ceil((1 - d / WAKE_R) * 3) / 3;
        ctx.globalAlpha = lvl * 0.55 * wake;
        const s = lvl > 0.9 ? 4 : 3;
        ctx.fillRect(Math.round(gx - s / 2), Math.round(gy - s / 2), s, s);
      }
    }
  }

  function frame(t: number) {
    const dt = Math.min(0.033, (t - (last || t)) / 1000);
    last = t;
    ctx.clearRect(0, 0, W, H);

    const target = overBlank && t - lastMove < 100 && o.wake && motionOK() ? 1 : 0;
    wake += (target - wake) * Math.min(1, dt * 10);
    if (o.wake) drawWake();

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]!;
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      if (p.gravity) p.vy += 1800 * dt;
      else { p.vx *= 0.82; p.vy *= 0.82; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const floor = H - p.size / 2;
      if (p.gravity && p.y > floor) {
        p.y = floor;
        if (!p.bounced) { p.vy *= -0.28; p.vx *= 0.5; p.bounced = true; }
        else { p.vy = 0; p.vx = 0; }
      }
      const k = p.age / p.life;
      const alpha = k < 0.6 ? 1 : Math.ceil((1 - k) / 0.4 * 3) / 3; // 3-step fade
      drawModule(p, alpha);
    }
    ctx.globalAlpha = 1;

    if (parts.length || wake > 0.02) raf = requestAnimationFrame(frame);
    else { raf = 0; last = 0; ctx.clearRect(0, 0, W, H); }
  }

  function wakeUp() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  /* ---------- pointer: trail + wake ---------- */
  const isBlank = (el: EventTarget | null) =>
    el instanceof Element && !el.closest(block) && !(window.getSelection()?.toString());

  function onMove(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      if (touch && (e.pointerId !== touch.id || Math.hypot(e.clientX - touch.x, e.clientY - touch.y) > 8)) touch = undefined;
      return;
    }
    if (!motionOK()) return;
    lastMove = performance.now();
    const blank = isBlank(e.target) && e.buttons === 0;
    if (px >= 0 && overBlank && blank && o.trail && motionOK()) {
      travel += Math.hypot(e.clientX - px, e.clientY - py);
      while (travel >= SPAWN_EVERY) { travel -= SPAWN_EVERY; spawn(e.clientX, e.clientY); }
    } else travel = 0;
    overBlank = blank;
    px = e.clientX; py = e.clientY;
    if ((blank && o.wake) || wake > 0.02) wakeUp();
  }
  function onLeave() { overBlank = false; px = -1; travel = 0; clearTicks(); viewports.forEach((_, v) => v.classList.remove('ff-has-reticle')); if (parts.length || wake > 0.02) wakeUp(); }

  /* touch: a tap on empty ground drops a short handful */
  function onTap(e: PointerEvent) {
    const tap = touch; touch = undefined;
    if (e.pointerType !== 'touch' || !tap || tap.id !== e.pointerId || performance.now() - tap.at > 500 || Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8 || !o.trail || !motionOK() || !isBlank(e.target)) return;
    for (let i = 0; i < 6; i++) spawn(e.clientX + (i - 2.5) * CELL * 3, e.clientY);
  }

  /* ---------- stamp on controls ---------- */
  function familyOf(el: Element): Family | null {
    const fam = el.closest<HTMLElement>('[data-ff-family]')?.dataset.ffFamily as Family | undefined;
    if (fam && fam in FAMILY_KIND) return fam;
    if (el.closest('.zone-lens, .lens-instrument')) return 'lens';
    if (el.closest('.zone-composition')) return 'composition';
    if (el.closest('.zone-camera')) return 'camera';
    return null;
  }
  function onDown(e: PointerEvent) {
    if (e.pointerType === 'touch') {
      onLeave();
      touch = e.isPrimary && motionOK() && isBlank(e.target) ? { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now() } : undefined;
    }
    if (!o.stamp || !motionOK()) return;
    const ctl = (e.target as Element | null)?.closest?.('.instrument-control, .category-trigger, [data-ff-family] button');
    if (!ctl) return;
    const fam = familyOf(ctl);
    if (fam) stampAt(e.clientX, e.clientY, fam);
  }

  /* ---------- reticle inside the viewport ---------- */
  const viewports = new Map<HTMLElement, { ret: HTMLElement; read: HTMLElement }>();
  function ensureReticle(vp: HTMLElement) {
    let r = viewports.get(vp);
    if (r) return r;
    const ret = document.createElement('span');
    ret.className = 'ff-reticle'; ret.setAttribute('aria-hidden', 'true');
    const read = document.createElement('span');
    read.className = 'ff-reticle-read'; read.setAttribute('aria-hidden', 'true');
    vp.append(ret, read);
    r = { ret, read };
    viewports.set(vp, r);
    return r;
  }
  function onVpMove(e: PointerEvent) {
    if (!o.reticle || !motionOK() || e.pointerType === 'touch') { viewports.forEach((_, v) => v.classList.remove('ff-has-reticle')); return; }
    const vp = (e.target as Element | null)?.closest?.<HTMLElement>('.instrument-viewport');
    viewports.forEach(({ ret, read }, v) => { if (!v.isConnected) { ret.remove(); read.remove(); viewports.delete(v); } else if (v !== vp) v.classList.remove('ff-has-reticle'); });
    if (!vp) return;
    const { ret, read } = ensureReticle(vp);
    const b = vp.getBoundingClientRect();
    if (b.width <= 0 || b.height <= 0 || e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) { vp.classList.remove('ff-has-reticle'); return; }
    const x = Math.max(0, Math.min(b.width, Math.round((e.clientX - b.left) / CELL) * CELL));
    const y = Math.max(0, Math.min(b.height, Math.round((e.clientY - b.top) / CELL) * CELL));
    ret.style.transform = `translate(${x}px, ${y}px)`;
    const label = `X ${(x / b.width).toFixed(2)}  Y ${(y / b.height).toFixed(2)}`;
    if (read.textContent !== label) read.textContent = label;
    // keep the readout inside the frame
    const rx = Math.max(0, Math.min(x + 16, b.width - read.offsetWidth - 8));
    const ry = Math.max(0, Math.min(Math.max(y - 22, 8), b.height - read.offsetHeight - 8));
    read.style.transform = `translate(${rx}px, ${ry}px)`;
    vp.classList.add('ff-has-reticle');
  }

  /* ---------- lens ruler: ticks near the pointer lift ---------- */
  let ticksCache: { ruler: Element; ticks: HTMLElement[] } | null = null;
  function onRulerMove(e: PointerEvent) {
    if (!o.tickLift || !motionOK() || e.pointerType === 'touch') { clearTicks(); return; }
    const ruler = (e.target as Element | null)?.closest?.('.lens-ruler');
    if (!ruler) { clearTicks(); return; }
    if (!ticksCache || ticksCache.ruler !== ruler) {
      clearTicks();
      ticksCache = { ruler, ticks: Array.from(ruler.querySelectorAll<HTMLElement>('.lens-tick')) };
    }
    let best = -1, bestD = Infinity;
    ticksCache.ticks.forEach((t, i) => {
      const b = t.getBoundingClientRect();
      const d = Math.abs(b.left + b.width / 2 - e.clientX);
      if (d < bestD) { bestD = d; best = i; }
    });
    ticksCache.ticks.forEach((t, i) => {
      const n = Math.abs(i - best);
      if (n <= 2) t.dataset.near = String(n); else delete t.dataset.near;
    });
  }
  function clearTicks() {
    ticksCache?.ticks.forEach((t) => delete t.dataset.near);
    ticksCache = null;
  }

  /* ---------- wiring ---------- */
  const onPointerMove = (e: PointerEvent) => { onMove(e); onVpMove(e); onRulerMove(e); };
  function stopEffects() {
    cancelAnimationFrame(raf); raf = 0; last = 0; lastMove = -Infinity;
    parts.length = 0; wake = 0; overBlank = false; travel = 0; px = -1; py = -1; touch = undefined;
    clearTicks(); ctx.clearRect(0, 0, W, H);
    viewports.forEach((_, v) => v.classList.remove('ff-has-reticle'));
  }
  const onTheme = () => { pal = readPalette(); if (reduce.matches) stopEffects(); };
  const onVisibility = () => { if (document.hidden) stopEffects(); };
  const onCancel = () => { touch = undefined; onLeave(); };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointerup', onTap, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('resize', resize);
  window.addEventListener('blur', stopEffects);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('scroll', stopEffects, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  reduce.addEventListener?.('change', onTheme);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onTap);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('resize', resize);
    window.removeEventListener('blur', stopEffects);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('scroll', stopEffects);
    document.removeEventListener('visibilitychange', onVisibility);
    reduce.removeEventListener?.('change', onTheme);
    clearTicks();
    viewports.forEach(({ ret, read }, vp) => { ret.remove(); read.remove(); vp.classList.remove('ff-has-reticle'); });
    canvas.remove();
  };
}
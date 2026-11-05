/**
 * Framefield — mosaic heading (R1)
 * A data-driven pixel mosaic drawn on one <canvas>. Cells are ordered-dithered:
 * cell SIZE encodes density, cell COLOUR encodes family. Only theme colours:
 *   camera (blue) = the subject / camera "now"
 *   lens (pink)   = the record: earlier positions, stepped blocks
 *   composition (green), ink = only where a scene needs them
 *
 * mountMosaic(el, { scene: 'tracking' }) → dispose()
 * Deterministic: the same scene + phase always draws the same cells.
 */

export type MosaicScene = 'tracking' | 'dolly' | 'orbit' | 'fov' | 'families';
type Tone = 'camera' | 'lens' | 'composition' | 'ink';

export interface MosaicOptions {
  scene: MosaicScene;
  cols?: number;          // default 64
  rows?: number;          // default 24
  gap?: number;           // CSS px between cells, default 1
  /** Step the scene one phase every `stepMs` (steps, not tweening). Off under reduced motion. */
  animate?: boolean;
  stepMs?: number;        // default 420
}

interface Layer {
  hit: (x: number, y: number) => boolean;
  tone: Tone;
  d: number;
  /** Optional per-column density (e.g. a streak that thickens toward the subject). */
  dAt?: (x: number) => number;
}
interface Block { x: number; y: number; s: number; tone: Tone }
interface SceneOut { layers: Layer[]; blocks: Block[] }

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const PHASES = 4;

/* ---------- shapes ------------------------------------------------------ */

/** The site's capsule subject. (cx, top) in cells, s = scale. */
const figure = (cx: number, top: number, s = 1) => (x: number, y: number) => {
  if (Math.hypot(x - cx, y - (top + 3.8 * s)) <= 2.6 * s) return true; // head, one-row neck gap
  const y0 = top + 8 * s, y1 = top + 22 * s, hw = 3.2 * s, yr = top + 11 * s;
  if (y < y0 || y > y1 || Math.abs(x - cx) > hw) return false;
  return y >= yr || Math.hypot(x - cx, y - yr) <= hw;
};

const crossShape = (cx: number, cy: number, r: number, t = 1) => (x: number, y: number) =>
  (Math.abs(x - cx) <= t && Math.abs(y - cy) <= r) || (Math.abs(y - cy) <= t && Math.abs(x - cx) <= r);

const ringShape = (cx: number, cy: number, r: number) => (x: number, y: number) => {
  const d = Math.hypot(x - cx, y - cy);
  return (d <= r && d >= r - 1.3) || d <= r * 0.32;
};

const checkerShape = (cx: number, cy: number, r: number) => (x: number, y: number) =>
  Math.abs(x - cx) <= r && Math.abs(y - cy) <= r && ((Math.floor((x - cx + r) / 2) + Math.floor((y - cy + r) / 2)) % 2 === 0);

/** Wedge from (cx,cy) toward angle deg (0 = right, -90 = up), half-angle h, length len. */
const wedgeShape = (cx: number, cy: number, deg: number, h: number, len: number) => (x: number, y: number) => {
  const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy);
  if (dist > len || dist < 1) return false;
  let a = (Math.atan2(dy, dx) * 180) / Math.PI - deg;
  a = ((a + 540) % 360) - 180;
  return Math.abs(a) <= h;
};

/** Stepped blocks climbing up-right from (x, y). */
const steps = (x: number, y: number, tone: Tone = 'lens'): Block[] => [
  { x, y: y + 9, s: 3, tone }, { x: x + 3, y: y + 6, s: 3, tone }, { x: x + 6, y: y + 3, s: 3, tone }, { x: x + 8, y, s: 3, tone },
  { x: x + 5, y: y + 15, s: 2, tone }, { x: x + 9, y: y + 19, s: 1, tone }, { x: x + 2, y: y + 21, s: 2, tone },
];

/* ---------- scenes ------------------------------------------------------ */

function scene(name: MosaicScene, cols: number, rows: number, phase: number): SceneOut {
  const top = Math.max(0, Math.round((rows - 23) / 2));
  switch (name) {
    case 'tracking': {
      // subject moves right; earlier positions trail left and flow toward it each phase
      const main = Math.round(cols * 0.75);
      const off = (phase % PHASES) * 1.75;
      const ghosts: Layer[] = [1, 2, 3, 4, 5].map((i) => {
        const cx = main - 7 * i + off;
        return { hit: figure(cx, top), tone: 'lens', d: Math.max(0.08, 0.72 - 0.15 * i + off * 0.04) };
      });
      // motion streak behind the subject; density rises toward it
      const streak: Layer = {
        hit: (x, y) => y >= top + 9 && y <= top + 21 && x >= 8 && x < main - 3,
        tone: 'lens', d: 0,
        dAt: (x) => 0.2 * Math.max(0, x - 8) / Math.max(1, main - 11),
      };
      return {
        layers: [
          streak,
          ...ghosts.reverse(),
          { hit: figure(main, top), tone: 'camera', d: 1 },
        ],
        blocks: steps(Math.min(cols - 11, main + 5), top),
      };
    }
    case 'dolly': {
      // camera pushes in: the subject grows; earlier (smaller) frames sit behind it
      const cx = Math.round(cols * 0.6);
      const grow = 0.05 * (phase % PHASES);
      const sizes = [0.45, 0.6, 0.75, 0.9];
      return {
        layers: [
          ...sizes.map((s, i) => {
            const sc = s + grow;
            // earlier frames: smaller and further left, feet on the same floor line
            return { hit: figure(cx - (1 - sc) * 34, top + (1 - sc) * 22, sc), tone: 'lens' as Tone, d: 0.2 + i * 0.16 };
          }),
          { hit: figure(cx, top, 1), tone: 'camera', d: 1 },
        ],
        blocks: steps(Math.min(cols - 11, cx + 9), top),
      };
    }
    case 'orbit': {
      const cx = Math.round(cols * 0.5), cy = top + 12, rx = Math.min(cols * 0.36, 26), ry = 10;
      const base = (phase % PHASES) * 0.35;
      const cams: Layer[] = [0, 1, 2, 3, 4, 5].map((i) => {
        const a = base + i * 0.55 + Math.PI * 0.35;
        return { hit: crossShape(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 2.2, 0.6), tone: (i === 5 ? 'camera' : 'lens') as Tone, d: i === 5 ? 1 : 0.35 + i * 0.12 };
      });
      const path: Layer = { hit: (x, y) => Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) < 0.06, tone: 'lens', d: 0.22 };
      return { layers: [path, { hit: figure(cx, top), tone: 'ink', d: 1 }, ...cams], blocks: [] };
    }
    case 'fov': {
      // a field-of-view wedge sweeping; earlier wedges in pink
      const cx = Math.round(cols * 0.14), cy = rows - 3;
      const a = -38 + (phase % PHASES) * 4;
      return {
        layers: [
          { hit: wedgeShape(cx, cy, a - 26, 12, cols), tone: 'lens', d: 0.16 },
          { hit: wedgeShape(cx, cy, a - 13, 12, cols), tone: 'lens', d: 0.32 },
          { hit: wedgeShape(cx, cy, a, 12, cols), tone: 'camera', d: 0.5 },
          { hit: figure(Math.round(cols * 0.78), top, 0.85), tone: 'camera', d: 1 },
          { hit: crossShape(cx, cy, 2, 0.5), tone: 'ink', d: 1 },
        ],
        blocks: [],
      };
    }
    case 'families':
    default: {
      // the three family modules, each with a lighter echo to its left
      const cy = top + 11, r = Math.min(8, rows / 2 - 2);
      const xs = [cols * 0.2, cols * 0.5, cols * 0.8].map(Math.round);
      const shift = (phase % PHASES) * 0.5;
      return {
        layers: [
          { hit: ringShape(xs[0]! - 6 + shift, cy, r), tone: 'lens', d: 0.25 },
          { hit: checkerShape(xs[1]! - 6 + shift, cy, r), tone: 'composition', d: 0.25 },
          { hit: crossShape(xs[2]! - 6 + shift, cy, r, 1), tone: 'camera', d: 0.25 },
          { hit: ringShape(xs[0]!, cy, r), tone: 'lens', d: 1 },
          { hit: checkerShape(xs[1]!, cy, r), tone: 'composition', d: 1 },
          { hit: crossShape(xs[2]!, cy, r, 1), tone: 'camera', d: 1 },
        ],
        blocks: [],
      };
    }
  }
}

/* ---------- renderer ---------------------------------------------------- */

function palette(): Record<Tone, string> {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string, fb: string) => cs.getPropertyValue(n).trim() || fb;
  return {
    camera: v('--ff-camera', '#1f6fd6'),
    lens: v('--ff-lens', '#d6338a'),
    composition: v('--ff-composition', '#0f8a5f'),
    ink: v('--ff-ink', '#141514'),
  };
}

const sizeFor = (d: number) => (d >= 0.9 ? 1 : d >= 0.55 ? 0.75 : d >= 0.3 ? 0.5 : 0.3);

export function drawMosaic(canvas: HTMLCanvasElement, opts: MosaicOptions, phase = 0) {
  const cols = opts.cols ?? 64, rows = opts.rows ?? 24, gap = opts.gap ?? 1;
  const cssW = canvas.clientWidth;
  if (!cssW) return;
  const cell = (cssW - gap * (cols - 1)) / cols;
  const cssH = rows * cell + gap * (rows - 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const pal = palette();
  const { layers, blocks } = scene(opts.scene, cols, rows, phase);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let tone: Tone | null = null, d = 0;
      const b = blocks.find((k) => x >= k.x && x < k.x + k.s && y >= k.y && y < k.y + k.s);
      if (b) { tone = b.tone; d = 1; } else {
        for (let i = layers.length - 1; i >= 0; i--) {
          const L = layers[i]!;
          if (!L.hit(x, y)) continue;
          const ld = L.dAt ? L.dAt(x) : L.d;
          if (ld <= 0) continue;
          if (ld >= 0.9 || ld * 16 > BAYER[y % 4]![x % 4]!) { tone = L.tone; d = ld; }
          break; // top-most layer that covers this cell decides
        }
      }
      if (!tone) continue;
      const s = cell * sizeFor(d);
      const px = x * (cell + gap) + (cell - s) / 2, py = y * (cell + gap) + (cell - s) / 2;
      ctx.fillStyle = pal[tone];
      ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    }
  }
}

/** Mount into a container: creates the canvas, redraws on resize, optional stepped animation. */
export function mountMosaic(el: HTMLElement, opts: MosaicOptions): () => void {
  const canvas = document.createElement('canvas');
  canvas.className = 'ff-mosaic-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  el.prepend(canvas);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let phase = 0, timer = 0, visible = false;
  const draw = () => drawMosaic(canvas, opts, phase);
  const tick = () => { phase = (phase + 1) % PHASES; draw(); };
  const start = () => {
    window.clearInterval(timer);
    if (opts.animate && !reduce.matches && visible && !document.hidden) timer = window.setInterval(tick, opts.stepMs ?? 420);
  };

  const ro = new ResizeObserver(draw);
  ro.observe(el);
  const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; start(); });
  io.observe(el);
  const onMotion = () => { phase = 0; draw(); start(); };
  reduce.addEventListener?.('change', onMotion);
  document.addEventListener('visibilitychange',start);

  draw();
  start();
  return () => {
    window.clearInterval(timer);
    ro.disconnect(); io.disconnect();
    reduce.removeEventListener?.('change', onMotion);
    document.removeEventListener('visibilitychange',start);
    canvas.remove();
  };
}

export type CellTone = Tone;
export const BAYER4 = BAYER;

/**
 * Shared painter for every mosaic (big headings and the small control-page mosaics).
 * `cellAt` returns the tone + density for a cell, or null. Density → dither + cell size.
 * Width comes from the canvas's CSS width; height follows the grid.
 */
export function paintCells(
  canvas: HTMLCanvasElement, cols: number, rows: number,
  cellAt: (x: number, y: number) => { tone: Tone; d: number; size?: number } | null, gap = 1,
) {
  const cssW = canvas.clientWidth;
  if (!cssW) return;
  const cell = (cssW - gap * (cols - 1)) / cols;
  const cssH = rows * cell + gap * (rows - 1);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  const pal = palette();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cellAt(x, y);
      if (!c || c.d <= 0) continue;
      // `size` = a fixed small mark (frames, guides, paths): always drawn, never dithered
      if (c.size == null && c.d < 0.9 && c.d * 16 <= BAYER[y % 4]![x % 4]!) continue;
      const s = cell * (c.size ?? sizeFor(c.d));
      const px = x * (cell + gap) + (cell - s) / 2, py = y * (cell + gap) + (cell - s) / 2;
      ctx.fillStyle = pal[c.tone];
      ctx.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    }
  }
}

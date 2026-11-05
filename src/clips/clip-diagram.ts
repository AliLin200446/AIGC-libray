/**
 * Framefield — camera setup diagrams (R1)
 * Data-driven plan + elevation SVGs for every MovementKind.
 * Positions are relative and authored, never measured. Colors come from
 * CSS custom properties so the theme stays the single source of truth.
 */
import type { CameraSetup, MovementKind } from './clip-model';

export type DiagramView = 'plan' | 'elevation';

const W = 500;
const H = 600;
const CELL = 4;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/* ---------- primitives ---------------------------------------------------- */

const line = (x1: number, y1: number, x2: number, y2: number, cls = 'd-ink', w = CELL) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="${w}"/>`;

const dashed = (x1: number, y1: number, x2: number, y2: number, cls = 'd-cam') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="${CELL}" stroke-dasharray="${CELL} ${CELL * 2}"/>`;

/** Camera module: pixel cross. */
const cross = (x: number, y: number, s = 26) => {
  const t = Math.round(s / 4);
  return `<g class="d-cam-fill"><rect x="${x - t / 2}" y="${y - s / 2}" width="${t}" height="${s}"/><rect x="${x - s / 2}" y="${y - t / 2}" width="${s}" height="${t}"/></g>`;
};

/** Subject module: lens ring (the subject is what the lens is on). */
const ring = (x: number, y: number, s = 26) =>
  `<g><circle cx="${x}" cy="${y}" r="${s / 2 - 1.8}" class="d-lens-stroke" fill="none" stroke-width="3.2"/><circle cx="${x}" cy="${y}" r="${s / 5}" class="d-lens-fill"/></g>`;

/** Composition module: checker (vanishing point / frame anchor). */
const checker = (x: number, y: number, s = 14) => {
  const h = s / 2;
  return `<g class="d-comp-fill"><rect x="${x - h}" y="${y - h}" width="${h}" height="${h}"/><rect x="${x}" y="${y}" width="${h}" height="${h}"/></g>`;
};

/** Label on a paper chip so it reads over lines. */
const label = (x: number, y: number, text: string, cls = '', anchor: 'start' | 'end' = 'start') => {
  const t = text.toUpperCase();
  const w = t.length * 6.3 + 10;
  const rx = anchor === 'start' ? x : x - w;
  return `<g class="d-label ${cls}"><rect x="${rx}" y="${y - 11}" width="${w}" height="17" class="d-paper"/><text x="${rx + 5}" y="${y + 2}">${esc(t)}</text></g>`;
};

/** Pixel arrowhead (3 stepped cells) pointing at angle (deg, 0 = right). */
const head = (x: number, y: number, deg: number, cls = 'd-cam-fill') => {
  const cells: [number,number][] = [[0, 0], [-1, -1], [-1, 1], [-2, -2], [-2, 2], [-3, -3], [-3, 3]];
  const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
  return `<g class="${cls}">${cells.map(([dx, dy]) => {
    const px = x + (dx * c - dy * s) * CELL, py = y + (dx * s + dy * c) * CELL;
    return `<rect x="${px - CELL / 2}" y="${py - CELL / 2}" width="${CELL + 0.5}" height="${CELL + 0.5}"/>`;
  }).join('')}</g>`;
};

/** Field-of-view wedge from (x,y) toward angle (deg, -90 = up). */
const wedge = (x: number, y: number, deg: number, fov: CameraSetup['fov'], len = 520) => {
  const half = { wide: 34, normal: 22, narrow: 12 }[fov];
  const a = ((deg - half) * Math.PI) / 180, b = ((deg + half) * Math.PI) / 180;
  return `<polygon points="${x},${y} ${x + Math.cos(a) * len},${y + Math.sin(a) * len} ${x + Math.cos(b) * len},${y + Math.sin(b) * len}" class="d-fov"/>`;
};

const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `<path d="M${x0} ${y0} A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}" class="d-cam" fill="none" stroke-width="${CELL}" stroke-dasharray="${CELL} ${CELL * 2}"/>`;
};

let clipSeq = 0;
/** Clip content (e.g. a FOV wedge) to a room rectangle. Unique id per call. */
const clipTo = (x: number, y: number, w: number, h: number, body: string) => {
  const id = `ffclip${++clipSeq}`;
  return `<defs><clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#${id})">${body}</g>`;
};

const svg = (body: string, aria: string) =>
  `<svg class="cp-diagram-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}" shape-rendering="crispEdges">${body}</svg>`;

/* ---------- defaults per kind ------------------------------------------- */

const GAP = { close: 110, medium: 170, far: 230 };

const DEFAULT_CAMERA_LABEL: Record<MovementKind, string> = {
  'track-follow': 'Camera · following',
  'track-lateral': 'Camera · alongside',
  'dolly-in': 'Camera · pushing in',
  'dolly-out': 'Camera · pulling out',
  pan: 'Camera · fixed, rotating',
  tilt: 'Camera · fixed, tilting',
  orbit: 'Camera · circling',
  crane: 'Camera · rising',
  handheld: 'Camera · handheld',
  static: 'Camera · locked off',
};

const HEIGHT_LABEL = { low: 'Low', eye: 'Eye level', high: 'High' };

/* ---------- plan view --------------------------------------------------- */

function plan(s: CameraSetup): string {
  const gap = GAP[s.distance];
  const subj = s.subjectLabel ?? 'Subject';
  const cam = s.cameraLabel ?? DEFAULT_CAMERA_LABEL[s.kind];
  const corridor = s.environment === 'corridor';
  const parts: string[] = [];

  // environment
  if (corridor) {
    parts.push(line(150, 30, 150, 570), line(350, 30, 350, 570));
    [110, 250, 400].forEach((y) => parts.push(line(136, y, 150, y)));
    [180, 330, 480].forEach((y) => parts.push(line(350, y, 364, y)));
    parts.push(checker(250, 30), label(262, 34, 'Vanishing point'));
  } else {
    parts.push(`<rect x="0" y="0" width="${W}" height="${H}" class="d-floor"/>`);
  }

  let C = { x: 250, y: 470 }, S = { x: 250, y: 260 }, aim = -90;
  const room = (body: string) => (corridor ? clipTo(152, 30, 196, 540, body) : body);

  switch (s.kind) {
    case 'track-follow':
      S = { x: 250, y: 250 }; C = { x: 250, y: 250 + gap + 60 };
      parts.push(room(wedge(C.x, C.y, aim, s.fov)));
      parts.push(dashed(C.x, C.y - 18, S.x, S.y + 18), label(262, (C.y + S.y) / 2, 'Steady gap', 'is-cam'));
      parts.push(head(S.x, S.y - 30, -90, 'd-ink-fill'));
      if (corridor) parts.push(label(158, 404, 'Near · fast'), label(158, 114, 'Far · slow'));
      break;
    case 'track-lateral':
      // in a corridor both stay between the walls; in the open the gap sets the spacing
      S = { x: corridor ? 185 : 210, y: 300 }; C = { x: corridor ? 315 : Math.min(210 + gap + 40, 460), y: 300 }; aim = 180;
      parts.push(room(wedge(C.x, C.y, aim, s.fov)));
      parts.push(dashed(S.x + 18, S.y, C.x - 18, C.y), label((S.x + C.x) / 2 - 40, S.y + 28, 'Hold distance', 'is-cam'));
      parts.push(head(S.x, S.y - 34, -90, 'd-ink-fill'), head(C.x, C.y - 34, -90));
      break;
    case 'dolly-in':
    case 'dolly-out': {
      S = { x: 250, y: 190 }; C = { x: 250, y: 470 };
      const to = s.kind === 'dolly-in' ? C.y - 140 : C.y + 90;
      parts.push(room(wedge(C.x, C.y, aim, s.fov)));
      parts.push(dashed(C.x, C.y, C.x, to), head(C.x, to, s.kind === 'dolly-in' ? -90 : 90));
      parts.push(label(262, (C.y + to) / 2, s.kind === 'dolly-in' ? 'Travel toward' : 'Travel away', 'is-cam'));
      break;
    }
    case 'pan':
      C = { x: 250, y: 480 }; S = { x: 330, y: 200 };
      parts.push(room(`<g opacity=".45">${wedge(C.x, C.y, -120, s.fov)}</g>${wedge(C.x, C.y, -70, s.fov)}`));
      parts.push(arcPath(C.x, C.y, 70, -130, -60), head(C.x + Math.cos(-1.05) * 70, C.y + Math.sin(-1.05) * 70, 30));
      parts.push(label(C.x + 60, C.y - 70, 'Rotate on axis', 'is-cam'));
      break;
    case 'orbit': {
      S = { x: 250, y: 270 }; const r = gap;
      C = { x: S.x, y: S.y + r };
      parts.push(room(wedge(C.x, C.y, aim, s.fov, r + 40)));
      parts.push(arcPath(S.x, S.y, r, 20, 330), head(S.x + Math.cos((330 * Math.PI) / 180) * r, S.y + Math.sin((330 * Math.PI) / 180) * r, 240));
      parts.push(label(S.x + r * 0.72, S.y + r * 0.72 + 20, 'Constant radius', 'is-cam'));
      break;
    }
    case 'handheld':
      parts.push(room(wedge(C.x, C.y, aim, s.fov)));
      parts.push(`<polyline points="${[0, 1, 2, 3, 4, 5].map((i) => `${C.x - 30 + i * 12},${C.y + 40 + (i % 2 ? -8 : 8)}`).join(' ')}" class="d-cam" fill="none" stroke-width="${CELL}"/>`);
      parts.push(label(C.x + 46, C.y + 44, 'Organic drift', 'is-cam'));
      break;
    case 'tilt':
    case 'crane':
    case 'static':
    default:
      parts.push(room(wedge(C.x, C.y, aim, s.fov)));
      parts.push(label(C.x + 22, C.y + 40, s.kind === 'static' ? 'No travel' : 'See elevation', 'is-cam'));
  }

  parts.push(ring(S.x, S.y), label(S.x + 20, S.y + 4, subj));
  parts.push(cross(C.x, C.y), label(C.x + 20, C.y + 4, cam, 'is-cam'));
  parts.push(label(16, 584, corridor ? 'Plan · corridor' : 'Plan', 'is-muted'));

  return svg(parts.join(''), `Plan view. ${cam}. ${subj}. Distance ${s.distance}.`);
}

/* ---------- elevation view --------------------------------------------- */

function elevation(s: CameraSetup): string {
  const floor = 440, ceiling = s.environment === 'corridor' ? 110 : -1;
  const camY = { low: 405, eye: 330, high: 190 }[s.height];
  const subj = s.subjectLabel ?? 'Subject';
  const parts: string[] = [];

  parts.push(line(30, floor, 470, floor));
  if (ceiling > 0) parts.push(line(30, ceiling, 470, ceiling), line(470, ceiling, 470, floor), label(458, ceiling + 22, 'End wall', 'is-muted', 'end'));

  // subject silhouette
  const sx = s.kind === 'track-lateral' ? 250 : 300;
  parts.push(`<rect x="${sx - 26}" y="${floor - 110}" width="52" height="110" rx="20" class="d-subject"/>`);
  parts.push(`<circle cx="${sx}" cy="${floor - 132}" r="20" class="d-subject"/>`);
  parts.push(ring(sx, floor - 182, 22), label(sx + 18, floor - 178, subj));

  let cx = 110; const cy = camY;
  const aimDeg = s.kind === 'tilt' ? -18 : Math.atan2(floor - 90 - camY, sx - cx) * (180 / Math.PI);

  if (s.kind === 'crane') {
    const top = 170;
    parts.push(arcPath(cx + 140, camY, 140, 180, 245), head(cx + 140 + Math.cos((245 * Math.PI) / 180) * 140, camY + Math.sin((245 * Math.PI) / 180) * 140, -40));
    parts.push(label(cx + 10, top - 6, 'Rise', 'is-cam'));
  }
  if (s.kind === 'tilt') parts.push(arcPath(cx, cy, 60, -40, 20), head(cx + Math.cos(0.35) * 60, cy + Math.sin(0.35) * 60, 110));
  if (s.kind === 'track-lateral') { cx = 110; parts.push(label(30, cy - 34, 'Beside subject', 'is-muted')); }
  if (s.kind === 'dolly-in' || s.kind === 'track-follow' || s.kind === 'track-lateral') parts.push(head(cx + 40, cy, 0));
  if (s.kind === 'dolly-out') parts.push(head(cx - 40, cy, 180));

  const top = ceiling > 0 ? ceiling + 2 : 0;
  parts.unshift(clipTo(32, top, 436, floor - top - 2, wedge(cx, cy, aimDeg, s.fov, 420)));
  parts.push(dashed(cx, floor - 2, cx, cy + 16));
  parts.push(cross(cx, cy), label(cx + 20, cy - 18, `Camera · ${HEIGHT_LABEL[s.height]}`, 'is-cam'));
  parts.push(label(16, 584, 'Elevation · side', 'is-muted'));

  return svg(parts.join(''), `Side elevation. Camera at ${HEIGHT_LABEL[s.height]} height. ${subj}.`);
}

export function renderDiagram(setup: CameraSetup, view: DiagramView): string {
  return view === 'plan' ? plan(setup) : elevation(setup);
}

/**
 * Framefield — control thumbnails (R1)
 * One visual language for all 12 cards:
 *   camera = blue cross · subject = pink ring · FOV = pale blue wedge
 *   composition guides = green dashes · frame = ink rectangle
 * Returns SVG strings (viewBox 400×300). Styled by .ix-thumb rules in index-page.css.
 */
import type { ThumbSpec } from './index-model';

const W = 400, H = 300, C = 4;

const cross = (x: number, y: number, s = 22) => {
  const t = Math.round(s / 4);
  return `<g class="t-cam-fill"><rect x="${x - t / 2}" y="${y - s / 2}" width="${t}" height="${s}"/><rect x="${x - s / 2}" y="${y - t / 2}" width="${s}" height="${t}"/></g>`;
};
const ring = (x: number, y: number, s = 22) =>
  `<g><circle cx="${x}" cy="${y}" r="${s / 2 - 1.8}" class="t-lens-stroke" fill="none" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${s / 5}" class="t-lens-fill"/></g>`;
const wedge = (x: number, y: number, deg: number, halfDeg: number, len = 600, cls = 't-fov') => {
  const a = ((deg - halfDeg) * Math.PI) / 180, b = ((deg + halfDeg) * Math.PI) / 180;
  return `<polygon class="${cls}" points="${x},${y} ${x + Math.cos(a) * len},${y + Math.sin(a) * len} ${x + Math.cos(b) * len},${y + Math.sin(b) * len}"/>`;
};
const dash = (x1: number, y1: number, x2: number, y2: number, cls = 't-cam') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" stroke-width="3" stroke-dasharray="3 5"/>`;
const arc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + Math.cos((a * Math.PI) / 180) * r, cy + Math.sin((a * Math.PI) / 180) * r];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `<path d="M${x0} ${y0} A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${a1 > a0 ? 1 : 0} ${x1} ${y1}" class="t-cam" fill="none" stroke-width="3" stroke-dasharray="3 5"/>`;
};
const cap = (text: string) => {
  // drawn at ~1.7× because the 400-wide SVG renders around 240px on a card
  const w = text.length * 10.6 + 14;
  return `<g class="t-cap"><rect x="${W - w - 10}" y="${H - 38}" width="${w}" height="28" class="t-paper"/><text x="${W - w - 3}" y="${H - 18}">${text}</text></g>`;
};
const frame = () => `<rect x="64" y="48" width="272" height="204" class="t-frame" fill="none" stroke-width="${C}"/>`;
const guideV = (x: number) => dash(x, 50, x, 250, 't-comp');
const guideH = (y: number) => dash(66, y, 334, y, 't-comp');

/** Horizontal FOV on a 36 mm-wide full-frame sensor, in degrees. */
export const horizontalFov = (f: number) => (2 * Math.atan(18 / f) * 180) / Math.PI;

function body(t: ThumbSpec): { svg: string; label: string } {
  switch (t.kind) {
    case 'pan':
      return { label: 'Plan view: camera rotates horizontally on a fixed axis.', svg:
        `<g opacity=".45">${wedge(200, 240, -125, 18)}</g>${wedge(200, 240, -60, 18)}${arc(200, 240, 52, -140, -40)}${cross(200, 240)}${cap('PLAN · ROTATE')}` };
    case 'tilt':
      return { label: 'Side view: camera rotates vertically on a fixed axis.', svg:
        `<line x1="30" y1="250" x2="370" y2="250" class="t-ink" stroke-width="${C}"/><g opacity=".45">${wedge(100, 170, -28, 14)}</g>${wedge(100, 170, 12, 14)}${arc(100, 170, 52, -50, 40)}${cross(100, 170)}${cap('SIDE · ROTATE')}` };
    case 'dolly':
      return { label: 'Plan view: camera translates toward the subject.', svg:
        `${wedge(200, 250, -90, 16)}${dash(200, 230, 200, 120)}<g class="t-cam-fill"><rect x="194" y="112" width="12" height="4"/><rect x="197" y="106" width="6" height="4"/></g>${ring(200, 70)}${cross(200, 250)}${cap('PLAN · TRANSLATE')}` };
    case 'orbit':
      return { label: 'Plan view: camera circles the subject at a constant radius.', svg:
        `<ellipse cx="200" cy="150" rx="120" ry="100" class="t-cam" fill="none" stroke-width="3" stroke-dasharray="3 5"/>${wedge(200, 250, -90, 10, 110)}<rect x="316" y="132" width="8" height="8" class="t-cam-fill"/>${ring(200, 150)}${cross(200, 250)}${cap('PLAN · CIRCLE')}` };
    case 'lens': {
      const fov = horizontalFov(t.focalMm);
      return { label: `${t.focalMm} mm lens: ${Math.round(fov)} degree horizontal field of view.`, svg:
        `${wedge(200, 272, -90, fov / 2)}${cross(200, 272, 18)}${cap(`${Math.round(fov)}° H`)}` };
    }
    case 'centered':
      return { label: 'Frame with the subject on the central axis.', svg:
        `${frame()}${guideV(200)}${ring(200, 150)}${cap('AXIS')}` };
    case 'symmetrical':
      return { label: 'Frame with mirrored elements either side of the axis.', svg:
        `${frame()}<rect x="110" y="100" width="44" height="110" class="t-mass"/><rect x="246" y="100" width="44" height="110" class="t-mass"/>${guideV(200)}${ring(200, 150)}${cap('MIRROR')}` };
    case 'thirds':
      return { label: 'Frame with the subject on a third-line intersection.', svg:
        `${frame()}${guideV(155)}${guideV(245)}${guideH(116)}${guideH(184)}${ring(245, 116)}${cap('THIRDS')}` };
    case 'negative-space':
      return { label: 'Frame where an empty field carries the composition.', svg:
        `${frame()}<rect x="68" y="52" width="176" height="196" class="t-hatch"/>${ring(290, 150)}${cap('FIELD')}` };
  }
}

let hatchSeq = 0;
export function thumbSVG(t: ThumbSpec): string {
  const { svg, label } = body(t);
  const id = `ixh${++hatchSeq}`;
  // per-SVG hatch pattern (ids must be unique in the document)
  const defs = `<defs><pattern id="${id}" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="8" class="t-comp-fill" opacity=".22"/></pattern></defs>`;
  return `<svg class="ix-thumb-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" shape-rendering="crispEdges">${defs}${svg.replace('class="t-hatch"', `fill="url(#${id})"`)}</svg>`;
}

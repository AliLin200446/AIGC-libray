import { focalParameter } from '../../controls/metadata';
/** Exploration values never become canonical research controls. */
export const canonicalFocals = focalParameter.canonicalLandmarks;
export const clampFocal = (value: number) => Math.max(focalParameter.min, Math.min(focalParameter.max, value));
export const canonicalFocal = (value: number) => canonicalFocals.find(mm => Math.abs(mm - value) <= .2);
export const focalReadout = (value: number) => `${Math.round(value)} MM`;
export function dragFocal(start: number, deltaX: number, pixelsPerMm = 12) { return clampFocal(start - deltaX / pixelsPerMm); }
export function keyFocal(value: number, key: string, shift = false): number | undefined {
  if (key === 'Home') return 24;
  if (key === 'End') return 85;
  if (key === 'ArrowLeft' || key === 'ArrowRight') return clampFocal(value + (key === 'ArrowLeft' ? -1 : 1) * (shift ? 5 : 1));
}
export function settleFocal(value: number) { return canonicalFocal(value) ?? value; }
export function focalCaption(value: number) {
  return value <= 30 ? 'Open the field.' : value <= 42 ? 'Stay close to the scene.' : value <= 60 ? 'Hold the reference.' : 'Compress the distance.';
}
/** Collapse multiple crossed detents into at most one transient per 45ms. */
export class TickGate {
  private previous = 50;
  private last = -Infinity;
  armed = false;
  sync(value: number) { this.previous = value; }
  cross(value: number, now: number): 'minor' | 'major' | undefined {
    const previous = this.previous; this.previous = value;
    const major=canonicalFocals.some(mm => (previous < mm && value >= mm) || (previous > mm && value <= mm));
    if (!this.armed || (!major && Math.floor(previous) === Math.floor(value)) || now - this.last < 45) return;
    this.last = now;
    return major ? 'major' : 'minor';
  }
}

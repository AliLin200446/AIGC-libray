import type { CompositionOverlay, LensComparisonGroup, VisualPreview } from './types';

export function motionPreview(action: string): VisualPreview {
  return { type: 'video', title: 'Motion study pending', alt: action, asset: null,
    requiredAsset: ['Same subject & environment', 'Locked lens · stationary subject', action, '5–8 second continuous loop'], overlays: [] };
}
export function compositionPreview(action: string, overlays: CompositionOverlay[]): VisualPreview {
  return { type: 'overlay', title: 'Composition study pending', alt: action, asset: null,
    requiredAsset: ['Same subject & environment', 'Consistent lens, scale & light', action], overlays };
}
export const lensComparison: LensComparisonGroup = {
  id: 'lens-matched-framing', name: 'One subject. Four focal lengths.',
  controlIds: ['lens-24mm', 'lens-35mm', 'lens-50mm', 'lens-85mm'], protocol: 'matched-framing',
  conditions: ['Same subject & environment', 'Same target framing', 'Recorded camera distance', 'Full-frame reference · fixed aperture'],
};
export function lensPreview(focalLength: number): VisualPreview {
  return { type: 'comparison', title: 'Controlled lens study pending', alt: `${focalLength}mm matched-framing lens comparison`, asset: null,
    requiredAsset: [...lensComparison.conditions, '24 / 35 / 50 / 85mm comparison'], overlays: [], comparisonGroupId: lensComparison.id };
}

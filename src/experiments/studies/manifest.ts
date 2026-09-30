import { controls } from '../../controls';
import type { ControlId, ParameterValue } from '../../controls/types';
import { lensComparison } from '../../visuals/previews';
import { baseline } from './baseline';
import type { BaselineVariable, StudyManifestEntry } from './types';

type Plan = Pick<StudyManifestEntry, 'variableChanged' | 'necessaryDependencies' | 'targetBehavior' | 'successCriteria' | 'rejectionCriteria' | 'likelyConfounds' | 'production'> & {
  parameters?: Record<string, ParameterValue>;
  role?: StudyManifestEntry['role'];
  comparisonGroupId?: string;
};
const dependency = (variable: BaselineVariable, reason: string) => ({ variable, reason });
const sharedReject = ['Material identity, wardrobe, pose, lighting or scene-geometry drift.', 'New subjects, mirrored/duplicated details, moving architecture, cuts, or undocumented digital reframing.'];
const output = ['Unretouched original plus provenance/settings record; never overwrite a rejected run.', '8:5 output, target 1600×1000 or nearest supported native resolution; keep identical dimensions across a set and do not crop to manufacture compliance.', 'No visible guides, text, watermarks added by the production workflow, audio, stylization or post-production stabilization. Provider marks must be recorded, never silently removed.'];
function motion(path: string, end: string, speed: string): StudyManifestEntry['production'] {
  return { startingFrame: 'Approved baseline_scene_v01, same pixels where start-frame conditioning supports it.', endingFrame: end, cameraPath: path, movementSpeed: speed, durationSeconds: 6, anchor: 'Track subject body center, face, foreground plinth corner and background column edges.', overlays: [] };
}
const plans: Record<ControlId, Plan> = {
  pan: {
    variableChanged: ['camera.orientation'], parameters: { direction: 'right', angle: 12, duration: 6, 'speed-profile': 'constant' },
    necessaryDependencies: [dependency('composition.anchor', 'Subject shifts left in frame during rightward yaw.'), dependency('composition.framing', 'A different sector of the same scene is revealed; do not recenter.')],
    targetBehavior: '12-degree rightward yaw about a fixed camera center over 6 seconds.',
    successCriteria: ['Landmarks move coherently left as the view rotates right.', 'No depth-dependent translation parallax; camera center stays fixed.', 'Right-side reveal extends the same architectural world.'],
    rejectionCriteria: ['Sideways camera tracking substitutes for yaw.', 'Subject or background translates independently.'], likelyConfounds: ['Flat image panning/cropping can imitate a turn; inspect new-region geometry and edge motion.', 'A featureless background makes rotation vs translation inconclusive.'],
    production: motion('Fixed center (0,-6,0.86); yaw 0→+12° toward +x, pitch/roll fixed.', 'Same subject left of center; more of the right wall visible.', '2°/s, continuous; no cuts or easing added to the measured interval.'),
  },
  tilt: {
    variableChanged: ['camera.orientation'], parameters: { direction: 'up', angle: 8, duration: 6, 'speed-profile': 'constant' },
    necessaryDependencies: [dependency('composition.anchor', 'Subject moves lower in image.'), dependency('composition.framing', 'More lintel/upper wall appears; feet may leave view as an expected framing change.')],
    targetBehavior: '8-degree upward pitch over 6 seconds from a fixed center.',
    successCriteria: ['World features travel downward consistently with upward pitch.', 'Vertical convergence changes plausibly without camera elevation.', 'Newly visible upper architecture remains stable.'],
    rejectionCriteria: ['Crane/pedestal motion substitutes for pitch.', 'Frame rolls or building geometry stretches.'], likelyConfounds: ['A vertical crop shift can mimic tilt.', 'Changing vertical convergence alone does not prove motion.'],
    production: motion('Fixed center; pitch 0→8° up, yaw/roll fixed.', 'Upper wall/lintel gains coverage; subject sits lower in frame.', '8/6° per second; constant target rate.'),
  },
  dolly: {
    variableChanged: ['camera.position'], parameters: { direction: 'in', distance: 1, duration: 6, 'subject-lock': true, 'speed-profile': 'constant' },
    necessaryDependencies: [dependency('composition.framing', 'Subject scale increases; framing must not be compensated by zoom.'), dependency('camera.focus', 'Focus distance follows the stationary subject from 6m to 5m; focal length stays fixed.')],
    targetBehavior: 'Physical forward translation from 6m to 5m at fixed 50mm, with depth-dependent spatial change.',
    successCriteria: ['Subject enlarges while its world position and identity remain fixed.', 'Foreground landmark expands/displaces more than farther landmarks; relative scale/occlusion changes cannot be explained by uniform scaling alone.', 'Camera travel is forward throughout; existing geometry remains coherent.'],
    rejectionCriteria: ['Uniform digital/optical zoom without depth evidence.', 'Subject walks toward camera.', 'Lens change cancels subject enlargement.', 'Insufficient legible depth landmarks: mark inconclusive and do not publish as proof.'], likelyConfounds: ['Image warping may imitate parallax.', 'Autofocus breathing may add scale change.', 'Metric travel cannot be recovered reliably from an uncalibrated generation.'],
    production: motion('(0,-6,0.86)→(0,-5,0.86)m, aim +y, roll/pitch/yaw fixed.', 'Subject larger, around 77% of frame height; foreground/background relationships change.', '1/6 m/s target; constant motion across six seconds.'),
  },
  orbit: {
    variableChanged: ['camera.position'], parameters: { direction: 'clockwise', arc: 20, radius: 6, duration: 6, 'subject-lock': true, 'speed-profile': 'constant' },
    necessaryDependencies: [dependency('camera.orientation', 'Aim toward the subject to follow the arc.'), dependency('composition.framing', 'Silhouette and background coverage change with view angle; hold distance, not identical pixels.')],
    targetBehavior: '20-degree clockwise camera arc viewed from above, radius 6m, subject stationary.',
    successCriteria: ['Subject surfaces become visible in the direction expected from the arc.', 'Background parallax and occlusion corroborate viewpoint change.', 'Radius/height stay approximately constant; subject does not rotate.'],
    rejectionCriteria: ['Turntable subject against fixed background.', 'Pan-only output.', 'Subject morphology changes or radius spirals.'], likelyConfounds: ['Unobserved sides of an image-conditioned scene are underconstrained.', 'Specular/shadow appearance may change with viewpoint despite fixed world lighting.'],
    production: motion('From (0,-6,0.86), clockwise viewed from +z: x=-6 sin(theta), y=-6 cos(theta), theta 0→20°; aim at subject center.', 'Camera near (-2.05,-5.64,0.86); a new subject side and shifted background are visible.', '20/6° per second; constant radius and height.'),
  },
  'lens-24mm': lensPlan(24, 2.88),
  'lens-35mm': lensPlan(35, 4.2),
  'lens-50mm': lensPlan(50, 6),
  'lens-85mm': lensPlan(85, 10.2),
  centered: compositionPlan('Body center at (0.50,0.50), tolerance ±0.05 per axis.', 'Preserve centered full-body anchor and scale; do not force minor environmental symmetry.', [], ['Body bounding-box midpoint falls within the predefined central tolerance.', 'Small left-only scene details remain asymmetric.'], ['Wrong anchor centered, subject resized or environment mirrored.']),
  symmetrical: compositionPlan('Vertical structural symmetry axis x=0.50.', 'Align major paired columns and the doorway around the vertical frame axis; retain real minor asymmetries.', [], ['Major architecture has bilateral structural correspondence around x=0.50.', 'Subject remains on the axis; plinth and left recess are not duplicated.'], ['Pixel mirroring, duplicated details or centered subject alone without balanced architecture.']),
  'rule-of-thirds': compositionPlan('Face-center at (1/3,1/3), tolerance ±0.05 per axis.', 'Reorient framing minimally until the face center reaches the upper-left thirds intersection; retain fixed world geometry and approximate subject scale.', [dependency('camera.orientation', 'Small yaw/pitch change required to move a static face anchor in the frame at fixed position/lens.'), dependency('composition.framing', 'Scene coverage and edge perspective necessarily change; no digital crop.')], ['Face center, not body center, lands near upper-left thirds intersection.', 'Subject remains fully readable and scale stays approximately consistent.'], ['Wrong intersection, centered face, visible grid, scale/crop substitution.']),
  'negative-space': compositionPlan('Right region x=0.60–1.00, full height; body center near x=0.30.', 'Reframe to expose the existing quiet right wall, reserving roughly 40% of the frame without deleting objects.', [dependency('camera.orientation', 'Minimal yaw reveals existing right-side space while keeping world positions/lens fixed.'), dependency('composition.framing', 'Left-side objects may leave the field of view; do not erase them from the world.')], ['Right 40% is contiguous and low-detail with no competing focal object.', 'Subject lies outside the region, near x=0.30, with approximate original scale.'], ['Subject shrinks excessively, quiet area is on wrong side, scene objects vanish in still-visible regions, added text/props.']),
};

function lensPlan(mm: number, distance: number): Plan {
  const reference = mm === 50;
  return {
    role: reference ? 'reference-arm' : 'treatment', comparisonGroupId: lensComparison.id,
    variableChanged: reference ? [] : ['camera.lens'], parameters: { protocol: 'matched-framing', 'baseline-focal-length': 50, aperture: 8, 'focus-target': 'primary-subject' },
    necessaryDependencies: reference ? [] : [dependency('camera.position', `Start at ${distance}m for matched full-body framing (6m × ${mm}/50); adjust only axial distance to match the approved subject bounding box and log actual distance.`), dependency('camera.focus', 'Refocus on the same subject plane after changing distance; keep f/8. Depth of field will not be physically identical.')],
    targetBehavior: reference ? '50mm reference arm anchors the four-image matched-framing set; this no-op is not evidence of successful focal-length change.' : `${mm}mm with matched subject framing; background scale/coverage and near/far relationships respond to the required viewpoint change.`,
    successCriteria: ['Same person, pose and environment; subject body center (0.50,0.50) and height approximately 64%.', 'Relative depth-landmark scale and facial projection are consistent with the chosen distance, rather than a style change.', 'All four members share framing, crop, lighting, aperture and focus-target policies; inspect as a set.'],
    rejectionCriteria: ['Only blur, portrait styling or invented wide-angle distortion changes.', 'Subject scale compensated by digital cropping.', 'One member changes scene/identity or lacks comparable landmarks; withhold the full set.'],
    likelyConfounds: ['Focal length alone does not change perspective: camera repositioning does.', 'Matching f-number and focus target does not match depth of field.', 'Uncalibrated generated images cannot prove physical focal length or exact distance.'],
    production: { startingFrame: 'Approved canonical world and 50mm framing reference; use the same conditioning protocol across the set.', endingFrame: `${mm}mm still; camera nominally (0,-${distance},0.86)m, aim +y; retain body-center anchor and height.`, cameraPath: 'No motion in final still. Reposition axially only as required by matched framing.', movementSpeed: 'Not applicable.', durationSeconds: null, anchor: 'Body bounding-box midpoint (0.50,0.50), height ~0.64; framing tolerance ±0.05 normalized units, recorded rather than silently corrected.', overlays: [] },
  };
}
function compositionPlan(anchor: string, target: string, dependencies: Plan['necessaryDependencies'], success: string[], rejection: string[]): Plan {
  return { variableChanged: ['composition.anchor'], necessaryDependencies: dependencies, targetBehavior: target,
    successCriteria: success, rejectionCriteria: rejection, likelyConfounds: ['Reframing can change edge geometry and what lies outside the view.', 'A baseline already satisfying the target is a no-op, not evidence of controllability.'],
    production: { startingFrame: 'Canonical world; use a documented neutral off-target framing for centered/symmetrical paired tests without changing the world.', endingFrame: target, cameraPath: 'Fixed camera center and 50mm; minimal documented orientation changes only where needed.', movementSpeed: 'Not applicable.', durationSeconds: null, anchor, overlays: [] } };
}

export const studyManifest: readonly StudyManifestEntry[] = controls.map(control => {
  const plan = plans[control.id];
  // Centered/symmetrical need an off-target baseline arm to avoid a trivial no-op.
  const dependencies = [...plan.necessaryDependencies];
  if (control.id === 'centered' || control.id === 'symmetrical') dependencies.push(dependency('camera.orientation', 'Paired off-target baseline uses +6° yaw; treatment restores baseline orientation. This derived frame uses the same world.'), dependency('composition.framing', 'Coverage changes when the camera reorients; the canonical world stays fixed.'));
  const unlocked = new Set([...plan.variableChanged, ...dependencies.map(item => item.variable)]);
  const locked = (Object.keys(baseline.locks) as BaselineVariable[]).filter(key => !unlocked.has(key));
  const mediaType = control.category === 'camera' ? 'video' : 'image';
  const requirements = [...output, ...(mediaType === 'video' ? ['6 seconds target (5–8 seconds only if provider constraint is recorded); native frame rate, target 24fps.', 'Single continuous shot; preserve original timing. Loop in the player with a documented endpoint jump, not a fabricated seamless return.'] : ['One still per arm and run; lens comparison delivered as one four-member set, not isolated favorites.'])];
  const checks = [...plan.successCriteria, ...control.evaluationCriteria.map(item => `${item.id}: ${item.description}`)];
  const reject = [...plan.rejectionCriteria, ...sharedReject];
  return {
    controlId: control.id, controlRevision: control.revision, studyId: `study_${control.id}_v01`, mediaType, baselineId: baseline.baselineId,
    role: plan.role ?? 'treatment', variableChanged: plan.variableChanged, variablesLocked: locked, necessaryDependencies: dependencies,
    parameterValues: { ...Object.fromEntries(control.parameters.map(parameter => [parameter.id, parameter.defaultValue])), ...plan.parameters },
    targetBehavior: plan.targetBehavior, successCriteria: checks, rejectionCriteria: reject, likelyConfounds: plan.likelyConfounds,
    assetRequirements: requirements, status: 'specified', production: { ...plan.production, overlays: control.visualPreview.overlays },
    ...(plan.comparisonGroupId ? { comparisonGroupId: plan.comparisonGroupId } : {}),
    generationHandoff: {
      referenceBaseline: `${baseline.baselineId}; no approved asset yet. Use the frozen master and registered reference bundle when approved. ${plan.production.startingFrame}`,
      controlBeingTested: control.name, canonicalIntent: control.creativeIntent, whatMustChange: plan.targetBehavior,
      whatMustNotChange: locked.map(key => `${key}: ${baseline.locks[key]}`),
      generationInstruction: `${plan.targetBehavior} ${plan.production.cameraPath} ${plan.production.endingFrame} ${mediaType === 'video' ? `Duration: 6 seconds. Speed: ${plan.production.movementSpeed}` : 'Produce a single still.'} Apply the locked world, lighting and subject references. Necessary dependencies: ${dependencies.map(item => `${item.variable}: ${item.reason}`).join(' ' ) || 'None; preserve the reference setup.'}`,
      preservationConstraints: reject, outputRequirements: requirements,
      evaluationChecklist: [...checks, 'Compare against the paired baseline before assessing collateral change.', 'Record failures and inconclusive observations; do not infer repeatability from one run.'], modelTranslationStatus: 'unassigned',
    },
  };
});

import { lensPreview } from '../visuals/previews';
import { amount, choice, sceneInvariants } from './parameters';
import type { ControlSpecification } from './types';

function lens(focalLength: 24 | 35 | 50 | 85, description: string, intent: string, behavior: string): ControlSpecification {
  const id = `lens-${focalLength}mm` as const;
  return {
    visualPreview: lensPreview(focalLength),
    id, revision: 1, name: `${focalLength}mm`, category: 'lens', media: ['image', 'video'],
    shortDescription: description,
    creativeIntent: intent,
    observableBehavior: [behavior, 'At a fixed viewpoint and sensor size, focal length changes field of view and image magnification, not perspective.', 'With matched subject framing, camera repositioning changes perspective and the relationship between subject and background.'],
    testConditions: [
      'Use a 36 × 24 mm full-frame reference; keep final aspect ratio and cropping consistent.',
      'Compare against a declared baseline focal length, holding the scene and subject fixed.',
      'Fixed-viewpoint protocol: hold camera position constant. Matched-framing protocol: reposition camera to keep subject size constant.',
      'Use depth-separated landmarks. A single uncalibrated image cannot prove physical focal length; cropping can imitate a narrower field of view.',
    ],
    parameters: [
      choice('protocol', 'Comparison protocol', 'Select what stays fixed while focal length changes.', ['fixed-viewpoint', 'matched-framing'], 'fixed-viewpoint'),
      amount('baseline-focal-length', 'Baseline focal length', 'Choose a different baseline for a meaningful comparison.', 'mm', 14, 200, focalLength === 50 ? 35 : 50),
      amount('aperture', 'Aperture', 'Hold the requested f-number constant; blur alone is not evidence of lens control.', 'f-number', 1.4, 16, 8),
      choice('focus-target', 'Focus target', 'Use the same focus target in the paired comparison.', ['primary-subject', 'background-landmark'], 'primary-subject'),
    ],
    invariants: [...sceneInvariants, 'Sensor format', 'Subject pose and world position', 'Aperture setting', 'Focus target', 'Camera orientation', 'Camera position for fixed-viewpoint tests; subject image scale for matched-framing tests'],
    evaluationCriteria: [
      { id: `${id}-fov`, description: 'Field of view and subject magnification change in the direction expected relative to the baseline focal length.' },
      { id: `${id}-perspective`, description: 'Perspective stays stable at a fixed viewpoint; in matched framing, near/far scale relationships change consistently with camera repositioning.' },
      { id: `${id}-isolation`, description: 'Lens-related geometry is distinguishable from blur, aesthetic styling or unrelated scene changes.' },
    ],
    knownFailureModes: [
      { id: `${id}-crop`, description: 'A crop imitates the narrower view without sufficient evidence to establish lens behavior.' },
      { id: `${id}-blur`, description: 'Only depth of field changes; requested field-of-view relationships are absent.' },
      { id: `${id}-aesthetic`, description: 'A generic landscape or professional-portrait aesthetic substitutes for optical behavior.' },
      { id: `${id}-framing`, description: 'Subject scale or camera position changes contrary to the selected comparison protocol.' },
    ],
    experimentStatus: 'untested',
  };
}

export const lensControls: ControlSpecification[] = [
  lens(24, 'Wide field of view under a full-frame reference.', 'Include substantial environmental context; examine near/far relationships when moving closer for matched framing.', 'Compared with 50mm at the same viewpoint, more of the scene is visible and the subject occupies less of the frame. Moving closer for matched framing increases near/far scale differences.'),
  lens(35, 'Moderately wide field of view under a full-frame reference.', 'Balance environmental context with subject emphasis without treating the lens as a style preset.', 'Compared with 50mm at the same viewpoint, the view is wider and the subject smaller. Matched framing requires a closer camera position, producing greater near/far scale differences.'),
  lens(50, 'Intermediate field of view under a full-frame reference.', 'Establish a controlled intermediate view for comparing wider and longer focal lengths.', 'Compared with 35mm at the same viewpoint, the view is narrower and subject magnification increases. Matched framing requires moving farther away, reducing near/far scale differences.'),
  lens(85, 'Narrower field of view under a full-frame reference.', 'Isolate a subject through narrower coverage and evaluate portrait/background relationships under matched framing.', 'Compared with 50mm at the same viewpoint, the field is narrower and subject magnification increases. For matched portrait framing, moving farther away reduces near/far scale differences, creating apparent perspective compression.'),
];

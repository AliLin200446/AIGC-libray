import { baseline } from './studies/baseline';
import { studyManifest } from './studies/manifest';
import { studyAssetName } from './studies/naming';
import { untestedEvaluation } from '../evaluation/types';
import type { Experiment, ExperimentRun } from './types';
import type { ModelIdentity, ModelTranslation } from '../translations/types';

export const lensSet01CommonInstruction = 'Use the supplied approved baseline_scene_v01 as the identity and environment reference. Preserve the same adult woman, face, short dark bob, slate-blue top, charcoal trousers, shoes and relaxed standing pose. Preserve the limestone courtyard, foreground plinth, paired columns, centered doorway, left-only wall recess and their world positions. Preserve the soft 10:00 AM front-left daylight, exposure and neutral white balance. Keep the camera level at 0.86m, looking along the original axis, with no roll. Keep the same 8:5 sensor crop, full-body center at (0.50,0.50), and body height approximately 64% of the frame. Keep f/8 and focus on the subject plane, allowing focus distance to follow camera distance; retain readable depth landmarks. Camera distance may change along the viewing axis only to maintain this framing. Do not crop, digitally zoom, beautify, relight, change pose or regenerate the environment. Produce one photographic still at the preregistered native resolution without added text or guides.';

export const lensSet01BaselineInstruction = `${baseline.scene} ${Object.values(baseline.locks).join(' ')} World layout in meters: ${baseline.landmarks.map(item => `${item.id} at (${item.positionMeters.join(',')})`).join('; ')}. Produce one neutral photographic still at 8:5, target 1600×1000 or a preregistered supported native size. Keep the foreground corner and at least two background landmarks legible. No dramatic styling, mirrors, added text or guides. This is the baseline master, not a treatment output.`;

const literal = {
  24: 'Photograph with a 24mm rectilinear full-frame lens.',
  35: 'Photograph with a 35mm rectilinear full-frame lens.',
  50: 'Photograph with a 50mm rectilinear full-frame lens.',
  85: 'Photograph with an 85mm rectilinear full-frame lens.',
} as const;
const translated = {
  24: 'Use substantially wider angular coverage than the reference. Move the viewpoint closer only enough to retain the same full-body framing. Relative to the subject, show stronger near/far scale separation: the foreground plinth becomes larger and the distant columns and doorway smaller, with more of the distant background visible. Preserve rectilinear architectural edges; do not add fisheye distortion or stretch anatomy.',
  35: 'Use moderately wider angular coverage than the reference. Move the viewpoint somewhat closer only enough to retain the same full-body framing. Relative to the subject, modestly increase the foreground plinth scale and reduce the distant columns and doorway scale, revealing somewhat more distant background. Keep these differences less pronounced than the substantially wide condition; preserve straight architectural edges.',
  50: 'Retain the reference angular coverage and viewpoint. Preserve its foreground-to-subject and background-to-subject scale relationships and the same environmental coverage. Reproduce the same full-body framing without reframing, changing facial projection or adding blur.',
  85: 'Use narrower angular coverage than the reference. Move the viewpoint farther away only enough to retain the same full-body framing. Relative to the subject, make the foreground plinth smaller and the distant columns and doorway larger, showing less of the distant background. Reduce near/far scale differences through the farther viewpoint, not blur, beautification or cropping.',
} as const;

/** Concrete pending batch. Null model and outputs are deliberate; this is not evidence. */
export function prepareLensSet01(modelKey = 'model-unassigned', model: ModelIdentity | null = null) {
  const experiments: Array<Omit<Experiment, 'model'> & { model: ModelIdentity | null }> = [];
  const runs: ExperimentRun[] = [];
  const translations: ModelTranslation[] = [];
  const outputs = [];
  const createdAt = new Date().toISOString();
  for (const condition of ['literal', 'translated'] as const) {
    for (const mm of [24, 35, 50, 85] as const) {
      const study = studyManifest.find(item => item.controlId === `lens-${mm}mm`);
      if (!study) throw new Error('Missing canonical lens study.');
      const instruction = `${lensSet01CommonInstruction}\n\n${condition === 'literal' ? literal[mm] : translated[mm]}`;
      const id = `lens-set-01:${modelKey}:${condition}:${mm}`;
      const translationId = `${id}:instruction-v01`;
      translations.push({ id: translationId, revision: 1, controlId: study.controlId, controlRevision: study.controlRevision, modelSlotId: 'model-a', status: 'draft', instruction, settings: {}, visualEvidence: [], observedBehavior: [], reliability: { status: 'untested', notes: [], evidenceRunIds: [] }, knownFailures: [], experimentNotes: ['Provider-neutral candidate; assign an actual model slot and freeze exact provider wording before generation.'] });
      experiments.push({
        id, studyId: study.studyId, baselineId: baseline.baselineId, comparisonSetId: `lens-set-01:${modelKey}:${condition}`,
        controlId: study.controlId, controlRevision: study.controlRevision, translationId, translationRevision: 1, model,
        parameterValues: { ...study.parameterValues }, references: [],
        baseline: { instruction: lensSet01BaselineInstruction, settings: {}, seed: null },
        translated: { instruction, settings: {}, seed: null },
        protocol: `lens-set-01 / ${condition} / matched-framing / ${study.role}; docs/experiments/lens-set-01.md`,
        controlledVariables: study.variablesLocked.map(key => `${key}: ${baseline.locks[key]}`), evaluation: untestedEvaluation(),
        notes: ['Awaiting human review, actual model/settings and an approved baseline. No generation has occurred.', 'The baseline is one shared frozen master, not an additional image generation per output. The 50mm arm is a fresh reference-preservation output, not the master itself.'],
      });
      for (const runNumber of [1, 2, 3]) {
        const runId = `${id}:run${String(runNumber).padStart(2, '0')}`;
        const name = studyAssetName({ baselineId: baseline.baselineId, studyId: study.studyId, modelKey, runNumber, attemptNumber: 1, arm: study.role === 'reference-arm' ? 'baseline' : 'treatment', artifact: 'output', extension: 'png' });
        const evaluation = untestedEvaluation();
        runs.push({ id: runId, experimentId: id, runNumber, createdAt,
          baseline: { instruction: lensSet01BaselineInstruction, settings: {}, seed: null }, translated: { instruction, settings: {}, seed: null },
          observations: [], evaluation: { intentFidelity: evaluation.intentFidelity, collateralChange: evaluation.collateralChange, notes: [] },
          failureModeIds: [], unexpectedFailures: [], notes: ['createdAt is plan creation time, not generation time.'], status: 'planned', baselineOutput: null, output: null,
        });
        outputs.push({ runId, condition, focalLength: mm, runNumber, studyId: study.studyId, role: study.role, filename: name,
          relativePath: `public/studies/lens-set-01/${modelKey}/${condition}/${name}`, status: 'planned',
          evaluation: { intentFidelity: 'untested', collateralPreservation: 'untested', shortcutReview: 'untested', crop: 'untested', digitalZoom: 'untested', dofChange: 'untested', beautification: 'untested', environmentRegeneration: 'untested', compositionChange: 'untested', identityChange: 'untested', notes: '' },
        });
      }
    }
  }
  const pairs = [];
  for (const condition of ['literal', 'translated']) for (const runNumber of [1, 2, 3]) for (const [left, right] of [[24, 35], [35, 50], [50, 85], [24, 85]]) {
    pairs.push({ kind: 'focal-length', leftRunId: `lens-set-01:${modelKey}:${condition}:${left}:run0${runNumber}`, rightRunId: `lens-set-01:${modelKey}:${condition}:${right}:run0${runNumber}`, status: 'untested', notes: '' });
  }
  for (const mm of [24, 35, 50, 85]) for (const runNumber of [1, 2, 3]) pairs.push({ kind: 'instruction-condition', leftRunId: `lens-set-01:${modelKey}:literal:${mm}:run0${runNumber}`, rightRunId: `lens-set-01:${modelKey}:translated:${mm}:run0${runNumber}`, status: 'untested', notes: '' });
  return { study: 'lens-set-01', modelKey, model, status: 'awaiting-human-review', baselineId: baseline.baselineId, baselineAsset: null, baselineApproved: false, experiments, runs, translations, outputs, pairs };
}

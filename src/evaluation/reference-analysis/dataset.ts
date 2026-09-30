import { expectationStates } from './types';
import type { Annotation, DatasetSlot } from './types';

export const compositions = ['centered', 'symmetrical', 'rule-of-thirds', 'negative-space'];
export const controls = [...compositions, 'lens-24mm', 'lens-35mm', 'lens-50mm', 'lens-85mm'];
const purposes = [
  'obvious centered', 'obvious symmetry', 'obvious rule of thirds', 'obvious negative space',
  'strong wide-like spatial relationship', 'moderate wide/normal transition',
  'strong normal-like relationship', 'strong telephoto-like relationship',
  'shallow DOF but insufficient lens evidence', 'cropped image where focal tendency is ambiguous',
  'composition supporting multiple valid controls', 'image with insufficient structural cues',
];
export function emptyAnnotation(referenceId: string): Annotation {
  return { referenceId, sourceProvenanceNote: '', expectedObservableTraits: [], compositionExpectations: [],
    lensTendencyExpectation: [], framingExpectation: [], knownAmbiguities: [], forbiddenClaims: [],
    acceptableSuggestedControls: [], unacceptableSuggestedControls: [], reviewNotes: '', captureMetadata: null,
    annotatedBy: '', readyForEvaluation: false };
}
export const dataset: DatasetSlot[] = purposes.map((purpose, index) => {
  const referenceId = `reference-${String(index + 1).padStart(2, '0')}`;
  return { referenceId, purpose, assetStatus: 'missing', assetFile: null, annotation: emptyAnnotation(referenceId) };
});
function requireCondition(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
export function validateManifest(value: unknown): asserts value is DatasetSlot[] {
  requireCondition(Array.isArray(value) && value.length > 0, 'Manifest must contain slots.');
  const ids = new Set<string>();
  for (const entry of value as DatasetSlot[]) {
    requireCondition(entry && /^reference-[a-z0-9-]+$/.test(entry.referenceId) && !ids.has(entry.referenceId), 'Invalid or duplicate reference ID.');
    ids.add(entry.referenceId);
    requireCondition(typeof entry.purpose === 'string' && entry.purpose.trim(), 'Purpose required.');
    requireCondition(['missing', 'present'].includes(entry.assetStatus), 'Invalid asset status.');
    requireCondition(entry.assetStatus === 'missing' ? entry.assetFile === null : typeof entry.assetFile === 'string' && /^[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(entry.assetFile), 'Use a plain image filename, no paths.');
    const a = entry.annotation;
    requireCondition(a && a.referenceId === entry.referenceId, 'Annotation reference mismatch.');
    for (const key of ['sourceProvenanceNote', 'reviewNotes', 'annotatedBy'] as const) requireCondition(typeof a[key] === 'string', `Invalid ${key}.`);
    requireCondition(typeof a.readyForEvaluation === 'boolean', 'Annotation readiness required.');
    for (const key of ['knownAmbiguities', 'forbiddenClaims', 'acceptableSuggestedControls', 'unacceptableSuggestedControls'] as const) {
      requireCondition(Array.isArray(a[key]) && a[key].every(v => typeof v === 'string' && v.trim()), `Invalid ${key}.`);
    }
    for (const key of ['expectedObservableTraits', 'compositionExpectations', 'lensTendencyExpectation', 'framingExpectation'] as const) {
      requireCondition(Array.isArray(a[key]), `Invalid ${key}.`);
      const seen = new Set<string>();
      for (const e of a[key]) {
        requireCondition(e && typeof e.value === 'string' && e.value.trim() && !seen.has(e.value) && expectationStates.includes(e.state) && typeof e.reason === 'string' && e.reason.trim(), `Invalid expectation in ${key}.`);
        seen.add(e.value);
        if (key === 'compositionExpectations') requireCondition(compositions.includes(e.value), 'Unknown composition.');
        if (key === 'lensTendencyExpectation') requireCondition(['wide-like', 'normal-like', 'telephoto-like', 'insufficient'].includes(e.value), 'Unknown lens tendency.');
        if (key === 'framingExpectation') requireCondition(['close-up', 'medium', 'medium-full', 'full-body', 'wide-environmental', 'ambiguous'].includes(e.value), 'Unknown framing.');
      }
    }
    requireCondition([...a.acceptableSuggestedControls, ...a.unacceptableSuggestedControls].every(v => controls.includes(v)), 'Unknown reconstruction control.');
    requireCondition(!a.acceptableSuggestedControls.some(v => a.unacceptableSuggestedControls.includes(v)), 'Conflicting control annotations.');
    requireCondition(a.captureMetadata === null || (typeof a.captureMetadata?.source === 'string' && !!a.captureMetadata.source.trim() && typeof a.captureMetadata.note === 'string'), 'Capture metadata needs an independent source.');
    if (a.readyForEvaluation) {
      requireCondition(a.annotatedBy.trim() && a.sourceProvenanceNote.trim(), 'Annotator and provenance required.');
      requireCondition(a.expectedObservableTraits.length && a.lensTendencyExpectation.length && a.framingExpectation.length && compositions.every(v => a.compositionExpectations.some(e => e.value === v)), 'Complete visible trait, composition, lens and framing expectations before marking ready.');
    }
  }
}

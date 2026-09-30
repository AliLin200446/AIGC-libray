import { compositions } from './dataset';
import { failureTaxonomy } from './failures';
import { supportStates, uncertaintyStates, usabilityStates } from './types';
import type { EvaluationRun, HumanReview } from './types';

export function reviewTargets(run: EvaluationRun): string[] {
  const a = run.normalizedAnalysis;
  return a ? [...a.observations.map(o => `observation:${o.id}`), ...compositions.map(id => `composition:${id}`),
    'lensTendency', 'framing', 'perspective', 'cameraMovement', ...a.suggestedControls.map((c, i) => `control:${i}:${c.controlId}`),
    'controlMapping:omissions', ...a.limitations.map((_, i) => `limitation:${i}`)] : ['providerError'];
}
export function blankReview(run: EvaluationRun): HumanReview {
  return { runId: run.runId, reviewer: '', items: reviewTargets(run).map(target => ({ target,
    statement: null, evidence: null, region: null, confidence: null, uncertainty: null, reason: '' })),
  observationQuality: '', inferenceQuality: '', uncertaintyQuality: '', controlMappingQuality: '', failures: [], usability: null };
}
export function validateReview(value: unknown, run: EvaluationRun): asserts value is HumanReview {
  const r = value as HumanReview;
  if (!r || r.runId !== run.runId || typeof r.reviewer !== 'string' || !r.reviewer.trim()) throw new Error('Run ID and reviewer required.');
  const targets = reviewTargets(run);
  if (!Array.isArray(r.items) || r.items.length !== targets.length || new Set(r.items.map(i => i.target)).size !== targets.length) throw new Error('Review every target exactly once.');
  for (const item of r.items) {
    if (!targets.includes(item.target) || !['statement', 'evidence', 'region', 'confidence'].every(key => supportStates.includes(item[key as 'statement']!)) || !uncertaintyStates.includes(item.uncertainty!) || typeof item.reason !== 'string' || !item.reason.trim()) throw new Error(`Complete support, uncertainty and reason for ${item.target}. Use NOT_ASSESSABLE where appropriate.`);
  }
  for (const key of ['observationQuality', 'inferenceQuality', 'uncertaintyQuality', 'controlMappingQuality'] as const) if (typeof r[key] !== 'string' || !r[key].trim()) throw new Error(`Required separate assessment: ${key}.`);
  if (!Array.isArray(r.failures) || r.failures.some(f => !f || !Object.hasOwn(failureTaxonomy, f.id) || ![...targets, 'analysis'].includes(f.target) || typeof f.reason !== 'string' || !f.reason.trim())) throw new Error('Failures need a taxonomy ID, target and reason.');
  if (!r.usability || !usabilityStates.includes(r.usability.status) || typeof r.usability.reason !== 'string' || !r.usability.reason.trim()) throw new Error('Usability status and short reason required.');
  if (!run.normalizedAnalysis && r.usability.status !== 'INVALID') throw new Error('A failed provider run must be INVALID.');
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Script } from 'node:vm';
import sharp from 'sharp';
import { dataset, validateManifest } from '../../src/evaluation/reference-analysis/dataset';
import { expectationStates, productGate } from '../../src/evaluation/reference-analysis/types';
import { failureTaxonomy } from '../../src/evaluation/reference-analysis/failures';
import { blankReview, validateReview } from '../../src/evaluation/reference-analysis/review';
import { fixtureResponse } from '../../src/library/reference/fixture';
import { normalizeAnalysis } from '../../src/library/reference/validate';
import { ReferenceRequestError } from '../../src/library/reference/errors';
import { initialize, immutableJSON, loadManifest, privateFile, saveReview, suiteRoot } from './store';
import { promptIdentifier, runOne } from './run';
import { reviewHTML, writeReviewPage } from './page';
import type { EvaluationRun } from '../../src/evaluation/reference-analysis/types';

const config = { apiKey: 'evaluation-test-secret', model: 'requested-model', timeoutMs: 60000 };
const result = () => normalizeAnalysis(structuredClone(fixtureResponse), { providerId: 'openai', model: 'returned-model-snapshot', contractVersion: '1', promptVersion: '1', latencyMs: 123, usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300 } });
async function suite(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'vcl-eval-'));
  try { await initialize(root); await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}
async function ready(root: string) {
  const slots = await loadManifest(root), slot = slots[0]!;
  slot.assetStatus = 'present'; slot.assetFile = 'reference-01.png';
  const a = slot.annotation;
  a.annotatedBy = 'Synthetic test reviewer'; a.sourceProvenanceNote = 'Generated test pixels; not pilot data.';
  a.expectedObservableTraits = [{ value: 'Test trait', state: 'AMBIGUOUS', reason: 'Test only' }];
  a.compositionExpectations = ['centered', 'symmetrical', 'rule-of-thirds', 'negative-space'].map(value => ({ value, state: 'ACCEPTABLE', reason: 'Synthetic multiple-valid interpretation test' }));
  a.lensTendencyExpectation = [{ value: 'insufficient', state: 'EXPECTED', reason: 'Test ambiguity' }, { value: 'normal-like', state: 'AMBIGUOUS', reason: 'Unknown crop' }];
  a.framingExpectation = [{ value: 'ambiguous', state: 'EXPECTED', reason: 'Test ambiguity' }];
  a.readyForEvaluation = true;
  await writeFile(join(root, 'manifest.json'), JSON.stringify(slots));
  await writeFile(join(root, 'images', slot.assetFile), await sharp({ create: { width: 12, height: 8, channels: 3, background: '#ffffff' } }).png().toBuffer());
}
function completeReview(run: EvaluationRun) {
  const review = blankReview(run); review.reviewer = 'Reviewer';
  for (const item of review.items) Object.assign(item, { statement: 'NOT_ASSESSABLE', evidence: 'NOT_ASSESSABLE', region: 'NOT_ASSESSABLE', confidence: 'NOT_ASSESSABLE', uncertainty: 'NOT_ASSESSABLE', reason: 'Synthetic workflow check only.' });
  review.observationQuality = 'Observations assessed separately.'; review.inferenceQuality = 'Inferences assessed separately.';
  review.uncertaintyQuality = 'Ambiguity considered.'; review.controlMappingQuality = 'Reconstruction usefulness considered.';
  review.usability = { status: run.normalizedAnalysis ? 'USEFUL_WITH_CAVEATS' : 'INVALID', reason: 'Workflow fixture, no visual truth asserted.' };
  return review;
}
test('12 missing slots have no invented expected answers; manifest is extensible and validated', () => {
  validateManifest(dataset); assert.equal(dataset.length, 12);
  for (const slot of dataset) { assert.equal(slot.assetStatus, 'missing'); assert.equal(slot.assetFile, null); assert.deepEqual(slot.annotation.expectedObservableTraits, []); assert.equal(slot.annotation.readyForEvaluation, false); }
  const duplicate = structuredClone(dataset); duplicate.push(duplicate[0]!); assert.throws(() => validateManifest(duplicate));
  const traversal = structuredClone(dataset); Object.assign(traversal[0]!, { assetStatus: 'present', assetFile: '../image.png' }); assert.throws(() => validateManifest(traversal));
  assert.equal(productGate.status, 'EXPERIMENTAL');
});
test('human expectations accept ambiguity and multiple compositions, never numerical confidence', async () => suite(async root => {
  await ready(root); const slots = await loadManifest(root); validateManifest(slots);
  assert.equal(slots[0]!.annotation.compositionExpectations.filter(e => e.state === 'ACCEPTABLE').length, 4);
  assert.equal(slots[0]!.annotation.lensTendencyExpectation[1]!.state, 'AMBIGUOUS');
  for (const state of expectationStates) { slots[0]!.annotation.expectedObservableTraits[0]!.state = state; validateManifest(slots); }
  const invalid = JSON.parse(JSON.stringify(slots)); invalid[0].annotation.lensTendencyExpectation[0].state = 0.9;
  assert.throws(() => validateManifest(invalid));
}));
test('missing image, annotation and explicit paid flag stop before adapter; no retries', async () => suite(async root => {
  let calls = 0; const adapter = async () => { calls++; return result(); };
  await assert.rejects(runOne('reference-01', false, config, root, adapter), /confirm-paid/);
  await assert.rejects(runOne('reference-01', true, config, root, adapter), /missing/);
  await ready(root); const slots = await loadManifest(root); slots[0]!.annotation.readyForEvaluation = false;
  await writeFile(join(root, 'manifest.json'), JSON.stringify(slots));
  await assert.rejects(runOne('reference-01', true, config, root, adapter), /annotation/); assert.equal(calls, 0);
  await ready(root);
  const failed = await runOne('reference-01', true, config, root, async () => { calls++; throw new ReferenceRequestError('rate_limit'); });
  assert.equal(calls, 1); assert.equal(failed.run.errorCode, 'rate_limit'); assert.equal(failed.run.normalizedAnalysis, null);
}));
test('runs retain provider, actual model, configuration, prompt/schema hashes and usage; histories never overwrite', async () => suite(async root => {
  await ready(root); const first = await runOne('reference-01', true, config, root, async () => result());
  const original = await readFile(first.path, 'utf8');
  assert.equal(first.run.provider, 'openai'); assert.equal(first.run.model, 'returned-model-snapshot'); assert.equal(first.run.modelVersion, null);
  assert.equal(first.run.modelConfiguration.requestedModel, 'requested-model'); assert.equal(first.run.promptVersion, promptIdentifier);
  assert.match(first.run.promptSha256, /^[a-f0-9]{64}$/); assert.match(first.run.schemaSha256, /^[a-f0-9]{64}$/);
  assert.equal(first.run.providerMetadata?.usage?.totalTokens, 300); assert.equal(first.run.providerMetadata?.latencyMs, 123);
  assert(!original.includes(config.apiKey)); assert(!original.includes('data:image'));
  await assert.rejects(immutableJSON(first.path, {}), { code: 'EEXIST' });
  const second = await runOne('reference-01', true, { ...config, model: 'different-model' }, root, async () => result());
  assert.notEqual(first.run.runId, second.run.runId);
  const review = completeReview(first.run); validateReview(review, first.run);
  const r1 = await saveReview(first.run, review, root), r2 = await saveReview(first.run, review, root);
  assert.notEqual(r1, r2); assert.equal(await readFile(first.path, 'utf8'), original);
  const page = await writeReviewPage(first.run, root); const html = await readFile(page, 'utf8');
  const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1]; assert(script); assert.doesNotThrow(() => new Script(script));
  assert(html.includes('data-overlay="0"')); assert(html.includes('overlay-0')); assert(html.includes('connect-src &#39;none&#39;') || html.includes("connect-src 'none'"));
}));
test('runner rejects invalid normalized output and mismatched provider attribution without bypassing validation', async () => suite(async root => {
  await ready(root);
  const invalid = result(); invalid.observations[0]!.region = { x: 2, y: 0, width: 1, height: 1 };
  const rejected = await runOne('reference-01', true, config, root, async () => invalid);
  assert.equal(rejected.run.normalizedAnalysis, null); assert.equal(rejected.run.errorCode, 'evaluation_validation_failed');
  const mismatch = result(); mismatch.providerMetadata.providerId = 'other-provider';
  const attributed = await runOne('reference-01', true, config, root, async () => mismatch);
  assert.equal(attributed.run.normalizedAnalysis, null); assert.equal(attributed.run.errorCode, 'evaluation_validation_failed');
}));
test('reviews require every aspect, separate quality assessments, uncertainty, and usability reason', async () => suite(async root => {
  await ready(root); const { run } = await runOne('reference-01', true, config, root, async () => result());
  assert.throws(() => validateReview(blankReview(run), run));
  const review = completeReview(run); validateReview(review, run);
  review.items[0]!.region = null; assert.throws(() => validateReview(review, run));
  review.items[0]!.region = 'UNSUPPORTED'; review.items[0]!.uncertainty = 'OVERCONFIDENT'; validateReview(review, run);
  review.usability!.reason = ''; assert.throws(() => validateReview(review, run));
}));
test('motion and exact focal-length failures remain distinct, support multiple failures and reject unknown IDs', async () => suite(async root => {
  await ready(root); const { run } = await runOne('reference-01', true, config, root, async () => { throw new ReferenceRequestError('consistency_check'); });
  assert.equal(Object.keys(failureTaxonomy).length, 16);
  const review = completeReview(run);
  review.failures = [{ id: 'motion-from-still', target: 'providerError', reason: 'Unsupported temporal claim under review.' }, { id: 'exact-focal-length-overclaim', target: 'providerError', reason: 'Unsupported capture claim, not a reconstruction suggestion.' }];
  validateReview(review, run); assert.equal(review.failures.length, 2);
  const invalid = JSON.parse(JSON.stringify(review)); invalid.failures[0].id = 'generic-error'; assert.throws(() => validateReview(invalid, run));
}));
test('private paths reject traversal/symlinks; offline page escapes model text and has no remote requests', async () => suite(async root => {
  await ready(root); await assert.rejects(privateFile(root, 'images', '../manifest.json'));
  await symlink(join(root, 'manifest.json'), join(root, 'images', 'escape.png'));
  await assert.rejects(privateFile(root, 'images', 'escape.png'), /symlinks/);
  assert(!suiteRoot.startsWith(process.cwd() + '/'));
  const { run } = await runOne('reference-01', true, config, root, async () => result());
  run.annotation.reviewNotes = '</script><script>alert(1)</script>';
  const html = reviewHTML(run, Buffer.alloc(0)); assert(!html.includes(run.annotation.reviewNotes)); assert(!html.includes('fetch('));
  const vite = await readFile('vite.config.ts', 'utf8'); assert(vite.includes('**/reference-evaluation/**')); assert(vite.includes('**/local-reference-suite/**'));
  const main = await readFile('src/main.ts', 'utf8'); assert(!main.includes('reference-eval'));
}));

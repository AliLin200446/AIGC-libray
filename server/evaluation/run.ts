import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { analyzeOpenAI, prepareImage, requestBody } from '../openai';
import type { ServerConfig } from '../openai';
import { ReferenceRequestError } from '../../src/library/reference/errors';
import { normalizeServerAnalysis } from '../../src/library/reference/validate';
import { referenceAnalysisSchema } from '../../src/library/reference/schema';
import type { EvaluationRun } from '../../src/evaluation/reference-analysis/types';
import { immutableJSON, loadManifest, privateFile, sha256, suiteRoot } from './store';

// Identity only: the canonical prompt and provider behavior are unchanged.
export const promptIdentifier = 'reference-analysis-v1';
export async function runOne(referenceId: string, confirmed: boolean, config: ServerConfig, root = suiteRoot, adapter = analyzeOpenAI) {
  if (!confirmed) throw new Error('One paid request requires --confirm-paid. No request sent.');
  const slot = (await loadManifest(root)).find(s => s.referenceId === referenceId);
  if (!slot) throw new Error('Unknown reference ID.');
  if (slot.assetStatus !== 'present' || !slot.assetFile) throw new Error('Reference asset is missing. No request sent.');
  if (!slot.annotation.readyForEvaluation) throw new Error('Complete the human annotation first. No request sent.');
  if (!config.apiKey) throw new Error('Server OPENAI_API_KEY is not configured. No request sent.');
  const bytes = await readFile(await privateFile(root, 'images', slot.assetFile));
  const mime = /\.png$/.test(slot.assetFile) ? 'image/png' : /\.webp$/.test(slot.assetFile) ? 'image/webp' : 'image/jpeg';
  // The review image uses exactly the provider preprocessing: orientation applied, no crop.
  const prepared = await prepareImage(bytes, mime);
  const imageSha256 = sha256(prepared.data); const imageReference = `${imageSha256}.png`;
  try { await writeFile(join(root, 'snapshots', imageReference), prepared.data, { flag: 'wx', mode: 0o600 }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    if (sha256(await readFile(await privateFile(root, 'snapshots', imageReference))) !== imageSha256) throw new Error('Image snapshot hash mismatch.', { cause: error }); }
  const prompt = await readFile(new URL('../../docs/reference-analysis-prompt.md', import.meta.url), 'utf8');
  const body = requestBody(config.model, prompt, Buffer.alloc(0));
  const run: EvaluationRun = {
    formatVersion: '1', runId: randomUUID(), referenceId, timestamp: new Date().toISOString(), imageReference, imageSha256,
    annotation: structuredClone(slot.annotation), provider: 'openai', model: config.model, modelVersion: null,
    promptVersion: promptIdentifier, promptSha256: sha256(prompt), schemaVersion: '1', schemaSha256: sha256(JSON.stringify(referenceAnalysisSchema)),
    modelConfiguration: { requestedModel: body.model, reasoningEffort: body.reasoning.effort, maxOutputTokens: body.max_output_tokens, store: body.store, imageDetail: 'high', timeoutMs: config.timeoutMs },
    normalizedAnalysis: null, providerMetadata: null, errorCode: null, latencyMs: 0, humanReview: null, failures: [], usability: null,
  };
  const started = Date.now();
  try {
    const analysis = normalizeServerAnalysis(await adapter(bytes, mime, config, new AbortController().signal));
    if (analysis.providerMetadata.providerId !== 'openai' || analysis.providerMetadata.promptVersion !== '1' || analysis.providerMetadata.contractVersion !== '1') throw new Error('Provider attribution mismatch.');
    run.normalizedAnalysis = analysis; run.providerMetadata = analysis.providerMetadata;
    run.model = analysis.providerMetadata.model ?? config.model;
    // No independent model version is exposed by this adapter; retain the returned model verbatim.
  } catch (error) { run.errorCode = error instanceof ReferenceRequestError ? error.code : 'evaluation_validation_failed'; }
  run.latencyMs = Date.now() - started;
  const path = join(root, 'runs', `${run.runId}.json`);
  await immutableJSON(path, run);
  return { run, path };
}

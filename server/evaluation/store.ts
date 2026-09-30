import { mkdir, readFile, writeFile, realpath, lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { dataset, validateManifest } from '../../src/evaluation/reference-analysis/dataset';
import { validateReview } from '../../src/evaluation/reference-analysis/review';
import type { EvaluationRun, ReviewSnapshot } from '../../src/evaluation/reference-analysis/types';

export const suiteRoot = join(homedir(), 'Library', 'Application Support', 'Visual Control Library', 'reference-evaluation');
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export async function immutableJSON(path: string, value: unknown) {
  await writeFile(path, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
export async function initialize(root = suiteRoot) {
  for (const folder of ['', 'images', 'snapshots', 'runs', 'reviews', 'review-pages']) await mkdir(join(root, folder), { recursive: true, mode: 0o700 });
  try { await immutableJSON(join(root, 'manifest.json'), dataset); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
}
export async function loadManifest(root = suiteRoot) {
  const value: unknown = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
  validateManifest(value); return value;
}
export async function privateFile(root: string, directory: 'images' | 'snapshots' | 'runs', filename: string) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename) || filename === '.' || filename === '..') throw new Error('Unsafe private filename.');
  const base = await realpath(root);
  const path = join(base, directory, filename);
  const actual = await realpath(path);
  if (actual !== resolve(base, directory, filename) || !actual.startsWith(base + sep) || !(await lstat(path)).isFile()) throw new Error('Private files must be regular files inside the suite, without symlinks.');
  return actual;
}
export async function loadRun(id: string, root = suiteRoot): Promise<EvaluationRun> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Expected a run UUID.');
  const run = JSON.parse(await readFile(await privateFile(root, 'runs', `${id}.json`), 'utf8')) as EvaluationRun;
  if (run.runId !== id || run.formatVersion !== '1') throw new Error('Run identity mismatch.');
  return run;
}
export async function saveReview(run: EvaluationRun, value: unknown, root = suiteRoot) {
  validateReview(value, run);
  const snapshot: ReviewSnapshot = { ...run, reviewId: randomUUID(), reviewedAt: new Date().toISOString(), humanReview: value, failures: value.failures, usability: value.usability };
  const path = join(root, 'reviews', `${run.runId}.${snapshot.reviewId}.json`);
  await immutableJSON(path, snapshot); return path;
}

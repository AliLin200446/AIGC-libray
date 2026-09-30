import { loadEnvFile } from 'node:process';
import { readFile } from 'node:fs/promises';
import { serverConfig } from '../openai';
import { initialize, loadManifest, loadRun, saveReview, suiteRoot } from './store';
import { promptIdentifier, runOne } from './run';
import { writeReviewPage } from './page';

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const allowed: Record<string, string[]> = { init: [], check: [], run: ['--reference', '--confirm-paid'], review: ['--run'], 'save-review': ['--run', '--file'] };
  if (!command || !Object.hasOwn(allowed, command)) throw new Error('Use init | check | run --reference reference-01 --confirm-paid | review --run UUID | save-review --run UUID --file PATH');
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const key = args[i]!;
    if (!allowed[command]!.includes(key) || values.has(key)) throw new Error('Unknown or repeated argument. Bulk execution is not supported.');
    const value = key === '--confirm-paid' ? 'yes' : args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${key}.`);
    values.set(key, value);
  }
  const required = (key: string) => { const v = values.get(key); if (!v) throw new Error(`${key} required.`); return v; };
  if (command === 'init') { await initialize(); console.log(`Private suite initialized: ${suiteRoot}\nEdit manifest.json and add images to images/. All 12 slots start missing.`); }
  if (command === 'check') { const slots = await loadManifest(); console.log(slots.map(s => `${s.referenceId}: ${s.assetStatus}, annotation ${s.annotation.readyForEvaluation ? 'ready' : 'pending'}`).join('\n')); }
  if (command === 'run') {
    // Match the existing server env precedence; never print credentials.
    for (const path of ['.env.local', '.env']) { try { loadEnvFile(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
    const config = serverConfig(process.env);
    console.log(`One reference: ${required('--reference')} | openai | ${config.model} | ${promptIdentifier} | schema 1`);
    const { run, path } = await runOne(required('--reference'), values.has('--confirm-paid'), config);
    console.log(`Saved ${path}\nStatus: ${run.errorCode ?? 'normalized; visual truth requires human review'}\nReview: npm run reference-eval -- review --run ${run.runId}\nNo retry was performed.`);
    if (run.errorCode) process.exitCode = 1;
  }
  if (command === 'review') console.log(`Open this private HTML file in your browser:\n${await writeReviewPage(await loadRun(required('--run')))}`);
  if (command === 'save-review') {
    const run = await loadRun(required('--run'));
    const review: unknown = JSON.parse(await readFile(required('--file'), 'utf8'));
    console.log(`Archived review snapshot: ${await saveReview(run, review)}`);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Evaluation command failed.'); process.exitCode = 1; });

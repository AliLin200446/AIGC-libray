import { URL } from 'node:url';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
// Bundle server-only code to resolve existing extensionless TS imports under Node ESM.
// Embed exact canonical prompt bytes; no runtime filesystem assumptions or environment values.
const prompt = await readFile(new URL('../docs/reference-analysis-prompt.md', import.meta.url), 'utf8');
await build({
  entryPoints: ['server/reference-function.ts'], outfile: 'server-build/reference-function.mjs',
  bundle: true, platform: 'node', format: 'esm', target: 'node24', sourcemap: false,
  external: ['sharp'],
  plugins: [{ name: 'canonical-reference-prompt', setup(context) {
    context.onLoad({ filter: /[/\\]server[/\\]prompt\.ts$/ }, () => ({ contents: `export async function readCanonicalPrompt() { return ${JSON.stringify(prompt)}; }`, loader: 'js' }));
  } }],
});

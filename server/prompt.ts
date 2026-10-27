import { readFile } from 'node:fs/promises';
export function readCanonicalPrompt() {
  return readFile(new URL('../docs/reference-analysis-prompt.md', import.meta.url), 'utf8');
}

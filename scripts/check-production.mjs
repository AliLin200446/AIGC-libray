import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { URL } from 'node:url';

// Guard against accidentally shipping the dev inspector while allowing the shared catalog.
const assets = await readdir(new URL('../dist/assets/', import.meta.url));
for (const asset of assets) {
  const text = await readFile(new URL(`../dist/assets/${asset}`, import.meta.url), 'utf8');
  for (const marker of ['CLIP INGESTION / LOCAL REVIEW ONLY','x-framefield-review','PEXELS_API_KEY','local-clip-ingestion','RECIPE INGEST / DEVELOPMENT ONLY','local-recipes/recipe-01','REFERENCE CURATION / DEVELOPMENT ONLY','framefield-reference-curation-v1','crane-jib','rear-follow']) assert(!text.includes(marker), 'Draft taxonomy or curation leaked into production.');
  assert(!text.includes('Known failure modes to test'), 'Dev inspector leaked into production.');
  assert(!text.includes('DEV / LOAD DEMO REFERENCE'), 'Reference fixture trigger leaked into production.');
  assert(!text.includes('Authored development fixture'), 'Reference fixture data leaked into production.');
  assert(!text.includes('The head anchor lies left of center near the upper-left thirds intersection.'), 'Reference fixture observations leaked into production.');
  assert(!text.includes('OPENAI_API_KEY'), 'Server credential configuration leaked into client assets.');
  assert(!text.includes('api.openai.com/v1/responses'), 'Direct OpenAI transport leaked into client assets.');
  assert(!text.includes('server-only-test-secret'), 'Test secret leaked into production.');
  assert(!text.includes('DEV / EXPORT NORMALIZED JSON'), 'Development export UI leaked into production.');
  for (const marker of ['Developer reference evaluation', '/dev/reference-eval', 'reference-evaluation', 'exact-focal-length-overclaim']) {
    assert(!text.includes(marker), 'Private evaluation tooling leaked into production.');
  }
}
console.log('Production check passed: dev inspector and reference fixtures excluded; shared catalog allowed.');

async function auditDirectory(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(item.name + (item.isDirectory() ? '/' : ''), directory);
    if (item.isDirectory()) { await auditDirectory(path); continue; }
    assert(!item.name.endsWith('.map'), 'Source map shipped.');
    if (!/\.(js|css|html|svg|json|txt|xml)$/.test(item.name)) continue;
    const text = await readFile(path, 'utf8');
    for (const marker of ['/Users/alilin/', '127.0.0.1', 'localhost', 'Application Support', 'local-reference-suite', 'reference-evaluation', 'OPENAI_API_KEY', 'DEV / LOAD DEMO REFERENCE']) assert(!text.includes(marker), `Private/development marker in ${item.name}: ${marker}`);
    assert(!/sk-(?:proj-)?[A-Za-z0-9_-]{20,}/.test(text), 'Possible credential in production output.');
    // Three.js retains its library diagnostic dispatcher; do not strip useful runtime errors.
    const applicationText = /^(?:home|scene)-/.test(item.name) ? text.replace(/function [\w$]+\(\.\.\.e\)\{let t=`THREE\.`\+e\.shift\(\);console\.log\(t,\.\.\.e\)\}/, '') : text;
    assert(!/console\.(?:log|debug)\(/.test(applicationText), 'Unexpected debug logging in production output.');
  }
}
await auditDirectory(new URL('../dist/', import.meta.url));
const rootHTML = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
assert(rootHTML.includes('https://framefield.alilinlab.com/'));
for (const id of ['pan','tilt','dolly','orbit','lens-24mm','lens-35mm','lens-50mm','lens-85mm','centered','symmetrical','rule-of-thirds','negative-space']) {
  const html = await readFile(new URL(`../dist/library/${id}/index.html`,import.meta.url),'utf8');
  assert(html.includes(`rel="canonical" href="https://framefield.alilinlab.com/library/${id}"`));
}
console.log('Release audit passed: canonical pages, no local paths, credentials, source maps or debug logs.');

assert((await readFile(new URL('../dist/index/index.html',import.meta.url),'utf8')).includes('<title>Components — Framefield</title>'));

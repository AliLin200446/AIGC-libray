import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { controls } from '../src/controls';
const base = 'https://framefield.alilinlab.com';
const html = await readFile('dist/index.html', 'utf8');
const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const control of controls) {
  const path = `/library/${control.id}`;
  const title = escape(`${control.name} — Framefield`);
  const page = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
    .replaceAll('https://framefield.alilinlab.com/', base + path)
    .replaceAll('content="Framefield — Visual Control Library for Generative Media"', `content="${title}"`)
    .replaceAll('Explore camera, lens and composition controls, then translate visual intent into model-specific generative instructions.', escape(control.shortDescription));
  await mkdir(`dist${path}`, { recursive: true });
  await writeFile(`dist${path}/index.html`, page);
}
await writeFile('dist/404.html', '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — Framefield</title><h1>Page not found</h1><p><a href="/">Return to Framefield</a></p></html>');
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /dev/\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...controls.map(c => `/library/${c.id}`)].map(path => `<url><loc>${base}${path}</loc></url>`).join('')}</urlset>`);

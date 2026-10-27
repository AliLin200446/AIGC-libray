import { clips as briefs } from '../src/clips/data';
import { readPublication } from '../server/clips/publication';
const clips = [...briefs, ...(await readPublication()).map(entry => entry.clip)];
import { publishedRecipes } from '../server/recipes';
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
const clipRoutes = [{ path: '/clips', title: 'Cinematic clips — Framefield', description: 'Explore camera movement study briefs and structured video generation prompts.' }, ...clips.map(clip => ({ path: '/clips/' + clip.id, title: clip.title + ' — Framefield Clips', description: clip.description }))];
for (const route of clipRoutes) {
  const page = html.replace(/<title>.*?<\/title>/, `<title>${escape(route.title)}</title>`)
    .replaceAll(base + '/', base + route.path)
    .replaceAll('content="Framefield — Visual Control Library for Generative Media"', `content="${escape(route.title)}"`)
    .replaceAll('Explore camera, lens and composition controls, then translate visual intent into model-specific generative instructions.', escape(route.description));
  await mkdir(`dist${route.path}`, { recursive: true });
  await writeFile(`dist${route.path}/index.html`, page);
}
const recipes=await publishedRecipes();
const recipeRoutes=[{path:'/index',title:'Components — Framefield',description:'A technical catalog of camera, lens and composition controls.'},{path:'/recipes',title:'Recipes — Framefield',description:'Reusable visual controls, exact model prompts and real generated results.'},...recipes.map(r=>({path:'/recipes/'+r.slug,title:r.title+' — Framefield Recipe',description:r.description??'A curated visual recipe. See the result, copy the controls and remix in Framefield.'}))];
for(const route of recipeRoutes){const page=html.replace(/<title>.*?<\/title>/, '<title>'+escape(route.title)+'</title>').replaceAll('https://framefield.alilinlab.com/','https://aigclibray.alilinlab.com'+route.path).replaceAll('content="Framefield — Visual Control Library for Generative Media"','content="'+escape(route.title)+'"').replaceAll('Explore camera, lens and composition controls, then translate visual intent into model-specific generative instructions.',escape(route.description));await mkdir('dist'+route.path,{recursive:true});await writeFile('dist'+route.path+'/index.html',page);}
await writeFile('dist/404.html', html.replace(/<title>.*?<\/title>/, '<title>Page not found — Framefield</title>').replace('</head>', '<meta name="robots" content="noindex"></head>'));
await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /dev/\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`);
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', ...clipRoutes.map(r => r.path), ...controls.map(c => `/library/${c.id}`), ...recipeRoutes.map(r=>r.path)].map(path => `<url><loc>${base}${path}</loc></url>`).join('')}</urlset>`);

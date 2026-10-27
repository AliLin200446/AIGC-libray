import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { staticSite } from './site';
test('public static server redirects legacy home, serves detail metadata, blocks private/API routes and unknown paths', async () => {
 const dir = await mkdtemp(join(tmpdir(), 'framefield-release-'));
 await mkdir(join(dir, 'library/lens-85mm'), { recursive:true });
 await mkdir(join(dir, 'recipes/published-example'), { recursive:true });
 await writeFile(join(dir, 'recipes/index.html'), 'Recipes index');
 await writeFile(join(dir, 'recipes/published-example/index.html'), 'Recipe detail');
 await mkdir(join(dir, 'index'), {recursive:true});
 await writeFile(join(dir,'index/index.html'),'Components catalog');
 await mkdir(join(dir, 'clips/dolly-in'), { recursive:true });
 await writeFile(join(dir, 'clips/index.html'), 'Clip collection');
 await writeFile(join(dir, 'clips/dolly-in/index.html'), 'Dolly in clip');
 await writeFile(join(dir, 'index.html'), 'Framefield home');
 await writeFile(join(dir, '404.html'), 'Page not found');
 await writeFile(join(dir, 'library/lens-85mm/index.html'), '85mm — Framefield');
 const handler = staticSite(dir); const server = createServer((req,res)=>{void handler(req,res);});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try {
  assert.equal(await (await fetch(base+'/')).text(),'Framefield home');
  assert.equal(await (await fetch(base+'/index')).text(),'Components catalog');
  const redirect=await fetch(base+'/library',{redirect:'manual'}); assert.equal(redirect.status,301); assert.equal(redirect.headers.get('location'),'/');
  const detail=await fetch(base+'/library/lens-85mm'); assert.equal(await detail.text(),'85mm — Framefield'); assert(detail.headers.get('content-security-policy')?.includes("frame-ancestors 'none'"));
  assert.equal(await (await fetch(base+'/recipes')).text(),'Recipes index');
  assert.equal(await (await fetch(base+'/recipes/published-example')).text(),'Recipe detail');
  assert.equal(await (await fetch(base+'/clips')).text(), 'Clip collection');
  assert.equal(await (await fetch(base+'/clips/dolly-in')).text(), 'Dolly in clip');
  assert.equal(await (await fetch(base+'/clips/dolly-in/')).text(), 'Dolly in clip');
  for(const path of ['/clips/unknown','/recipes/recipe-01','/dev/recipes','/dev/controls','/dev/reference-eval','/api/reference-analysis','/missing','/library/unknown']) assert.equal((await fetch(base+path)).status,404);
  assert.equal((await fetch(base+'/api/reference-analysis',{method:'POST'})).status,405);
 } finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); await rm(dir,{recursive:true,force:true}); }
});

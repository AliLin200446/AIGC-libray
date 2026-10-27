import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { readReferences, reviewReference } from './store';
import { importUrls, importUpload, selectClip, parseVideoUrl, inspectVideo, assetFile, canServe, validateRange } from './import';
import { parseManifest } from './manifest';
import { filmReviewMiddleware } from './plugin';
import type { ImportInput } from './types';
async function fixture(){const root=await mkdtemp(join(tmpdir(),'framefield-import-'));await mkdir(join(root,'docs/research'),{recursive:true});await copyFile('docs/research/film-discovery-2026-10-26.json',join(root,'docs/research/film-discovery-2026-10-26.json'));return root;}
const input:ImportInput={id:'film-discovery-01',version:1,reviewer:'Test',notes:'Test-only synthetic asset',sourceUrl:'https://www.youtube.com/watch?v=AfZbh4cteqI'};
const oembed:typeof fetch=async url=>{assert.ok(String(url).startsWith('https://www.youtube.com/oembed?')||String(url).startsWith('https://vimeo.com/api/oembed.json?'));return new Response(JSON.stringify({type:'video',title:'Provider title',author_name:'Publisher',html:'<script>untrusted</script>'}));};
test('URL imports associate existing IDs, normalize URLs, preserve attribution, and grant no rights',async()=>{
 const root=await fixture();try{
 for(const url of ['http://youtube.com/watch?v=AfZbh4cteqI','https://evil.test/a','https://youtube.com.evil.test/watch?v=AfZbh4cteqI','https://user:pass@youtube.com/watch?v=AfZbh4cteqI','https://www.youtube.com/playlist?list=a','https://127.0.0.1/x'])assert.throws(()=>parseVideoUrl(url));
 assert.equal(parseVideoUrl('https://youtu.be/AfZbh4cteqI?t=10').sourceUrl,input.sourceUrl);assert.equal(parseVideoUrl('https://player.vimeo.com/video/123456').provider,'vimeo');
 let [c]=await importUrls(root,[input],oembed);assert.ok(c);assert.equal(c.id,input.id);assert.equal((await readReferences(root)).length,12);assert.equal(c.media?.attribution,'Publisher');assert.equal(c.media?.displayPermission,false);assert.deepEqual(c.permissions,{});
 await assert.rejects(importUrls(root,[{...input,version:c.version}],oembed),/already imported/);
 await assert.rejects(importUrls(root,[{...input,id:'missing'}],oembed),/Unknown reference/);
 c=await reviewReference(root,{id:c.id,version:c.version,action:'verify-rights',scope:'embed',reviewer:'Test',notes:'Test fixture permission only',evidence:'Test-only embedding authorization',expiresAt:'2099-01-01'});assert.equal(c.media?.displayPermission,true);
 c=await selectClip(root,{...input,version:c.version,startTime:12});assert.equal(c.media?.startTime,12);assert.equal(c.media?.endTime,null);
 c=await reviewReference(root,{id:c.id,version:c.version,action:'revoke-rights',scope:'embed',reviewer:'Test',notes:'Revoke test grant'});assert.equal(c.media?.displayPermission,false);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('batch manifests parse quoted CSV and fail atomically for duplicate IDs or metadata failure',async()=>{
 const root=await fixture();try{
 assert.equal(parseManifest('id,version,sourceUrl,reviewer,notes\nfilm-discovery-01,1,https://youtu.be/AfZbh4cteqI,Test,"a, b"')[0]!.notes,'a, b');assert.equal(parseManifest(JSON.stringify([input])).length,1);
 await assert.rejects(importUrls(root,[input,input],oembed),/Duplicate/);
 await assert.rejects(importUrls(root,[input,{...input,id:'film-discovery-02',sourceUrl:'https://vimeo.com/123456'}],async u=>String(u).includes('vimeo')?new Response('',{status:404}):oembed(u)),/unavailable/);
 assert.ok((await readReferences(root)).every(c=>!c.media));
 const rows=await importUrls(root,[input,{...input,id:'film-discovery-02',sourceUrl:'https://vimeo.com/123456'}],oembed);assert.equal(rows.length,2);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('local uploads validate format, protect original, require explicit editing, and enforce revocation on byte-range playback',async()=>{
 const root=await fixture();let server:ReturnType<typeof createServer>|undefined;
 try{
 const temp=join(root,'upload.webm');await copyFile('scripts/fixtures/clips/mock-1/video.webm',temp);const original=await readFile(temp);
 await assert.rejects(inspectVideo(temp,'video/mp4','bad.mp4'),/signature/);await assert.rejects(inspectVideo(temp,'text/plain','video.webm'),/MIME/);
 const bad=join(root,'bad.webm');await writeFile(bad,'not video');await assert.rejects(inspectVideo(bad,'video/webm','bad.webm'),/signature/);
 let c=await importUpload(root,{...input,attribution:'FRAMEFIELD original synthetic test',storageEvidence:'Authored test fixture; authorized storage',expiresAt:'2099-01-01'},temp,'video/webm','study.webm');assert.equal(c.media?.importStatus,'uploaded');assert.equal(canServe(c,'original'),false);
 await assert.rejects(selectClip(root,{...input,version:c.version,startTime:0,endTime:1},true),/editing permissions/);
 for(const scope of ['display','edit'] as const)c=await reviewReference(root,{id:c.id,version:c.version,action:'verify-rights',scope,reviewer:'Test',notes:'Original synthetic fixture',evidence:'Authored test fixture only',expiresAt:'2099-01-01'});
 c=await selectClip(root,{...input,version:c.version,startTime:0.2,endTime:1.4},true);assert.equal(c.media?.importStatus,'ready');assert.ok(c.media?.posterPath);assert.deepEqual(await readFile(assetFile(root,c.media!.localAssetPath!)),original);assert.ok((await readFile(assetFile(root,c.media!.optimizedPath!))).length>0);
 assert.throws(()=>validateRange(0,13,20),/12 seconds/);assert.throws(()=>validateRange(-1,2,20));assert.throws(()=>validateRange(0,NaN,20));
 const dup=join(root,'dup.webm');await writeFile(dup,original);await assert.rejects(importUpload(root,{...input,id:'film-discovery-02',attribution:'Test',storageEvidence:'Test',expiresAt:'2099-01-01'},dup,'video/webm','dup.webm'),/Duplicate/);
 const middleware=filmReviewMiddleware(root);server=createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end();}));await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const url=`http://127.0.0.1:${address.port}/admin/references/api/media/${c.id}/optimized`;
 const partial=await fetch(url,{headers:{Range:'bytes=0-31'}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,32);assert.equal((await fetch(url,{headers:{Range:'bytes=999999999-'}})).status,416);
 c=await reviewReference(root,{id:c.id,version:c.version,action:'revoke-rights',scope:'edit',reviewer:'Test',notes:'Revoke processing'});assert.equal((await fetch(url)).status,400);assert.ok(canServe(c,'original'));
 c=await reviewReference(root,{id:c.id,version:c.version,action:'revoke-rights',scope:'display',reviewer:'Test',notes:'Revoke playback'});assert.equal(canServe(c,'original'),false);
 }finally{server?.closeAllConnections();if(server)await new Promise<void>(r=>server!.close(()=>r()));await rm(root,{recursive:true,force:true});}
});

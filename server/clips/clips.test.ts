import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { seedMock, mockAnalysis } from './mock';
import { atomicJSON, hash, readBatch, candidateDigest } from './store';
import { reviewCandidate } from './review';
import { candidate, runLiveBatch } from './pipeline';
import { validateAnalysis, validatePermission } from './schema';
import { parseVideo, pexelsAdapter, boundedResponse, providerUrl } from './provider';
import { samplePlan } from './media';
import { preparePublication, readPublication, toClip } from './publication';
import { reviewMiddleware } from './plugin';
import { analyzeCandidate } from './analysis';
import type { Permission, VideoMetadata } from './types';
const permission:Permission={provider:'pexels',verifiedBy:'Test reviewer',reference:'Test-only permission fixture',verifiedAt:'2020-01-01T00:00:00Z',expiresAt:'2099-01-01T00:00:00Z',discovery:true,cache:true,thirdPartyAnalysis:true,publicDisplay:true};
const metadata=(id:number):VideoMetadata=>({provider:'pexels',providerId:String(id),sourceUrl:`https://www.pexels.com/video/${id}/`,creator:'Test creator',creatorUrl:'https://www.pexels.com/@test/',title:'Test metadata',thumbnailUrl:`https://images.pexels.com/videos/${id}/poster.jpg`,videoUrl:`https://videos.pexels.com/video-files/${id}/test.mp4`,duration:2.4,width:640,height:360,licenseName:'Pexels License',licenseUrl:'https://www.pexels.com/license/',query:'tracking',retrievedAt:new Date().toISOString()});
async function temporary(run:(dir:string)=>Promise<void>){const dir=await mkdtemp(resolve(tmpdir(),'ff-ingestion-'));try{await run(dir);}finally{await rm(dir,{recursive:true,force:true});}}

test('Pexels adapter uses authenticated current endpoint, bounded renditions and no scraping',async()=>{
 const input={id:123,url:'https://www.pexels.com/video/123/',image:'https://images.pexels.com/videos/123/image.jpg',duration:8,width:1920,height:1080,user:{name:'Artist',url:'https://www.pexels.com/@artist/'},video_files:[{link:'https://videos.pexels.com/video-files/123/hd.mp4',file_type:'video/mp4',width:1280,height:720},{link:'https://videos.pexels.com/video-files/123/4k.mp4',file_type:'video/mp4',width:3840,height:2160}]};
 const parsed=parseVideo(input,'dolly');assert.equal(parsed.width,1280);assert.equal(parsed.licenseName,'Pexels License');
 let calls=0;const adapter=pexelsAdapter('test-key',async(url,init)=>{calls++;assert(String(url).startsWith('https://api.pexels.com/v1/videos/search?'));assert.equal(new Headers(init?.headers).get('Authorization'),'test-key');assert.equal(init?.redirect,'error');return Response.json({videos:[input]});});
 assert.equal((await adapter.discover('dolly')).length,1);assert.equal(calls,1);
 for(const url of ['http://videos.pexels.com/a','https://youtube.com/a','https://videos.pexels.com.evil.test/a','https://localhost/a','https://x@videos.pexels.com/a'])assert.throws(()=>providerUrl(url,'media'));
 await assert.rejects(()=>boundedResponse(new Response('12345'),4));
 const failed=pexelsAdapter('test-key',async()=>new Response('',{status:429}));await assert.rejects(()=>failed.discover('pan'),/429/);
});
test('permissions fail closed before any provider call and before budget allocation',async()=>temporary(async dir=>{
 let calls=0;await assert.rejects(()=>runLiveBatch(dir,{provider:{discover:async()=>{calls++;return [];}},preflight:async()=>{},cache:async()=>{},analyze:async()=>{}}));assert.equal(calls,0);assert.equal(await readBatch(dir),null);
 assert.throws(()=>validatePermission({...permission,cache:false},'cache'));assert.throws(()=>validatePermission({...permission,expiresAt:'2021-01-01'},'cache'));
}));
test('controlled pilot deduplicates IDs/URLs/content, caps calls, stops and refuses rerun',async()=>temporary(async dir=>{
 await writeFile(resolve(dir,'permission.json'),JSON.stringify(permission));let searches=0,analyses=0;
 const deps={provider:{discover:async()=>{const base=++searches;return [metadata(base),metadata(base),metadata(base+8)];}},preflight:async()=>{},cache:async(c:ReturnType<typeof candidate>)=>{
   c.asset={file:`${c.id}/video.mp4`,poster:`${c.id}/poster.jpg`,sha256:hash(c.id==='pexels-2'?'pexels-1':c.id),posterSha256:hash('poster')};c.samples=samplePlan(2.4,c.id);
 },analyze:async(c:ReturnType<typeof candidate>)=>{analyses++;c.analysis=validateAnalysis(mockAnalysis(1),c.samples);}};
 const batch=await runLiveBatch(dir,deps);assert.equal(batch.candidates.length,12);assert.equal(batch.requests,8);assert.equal(batch.analysisCalls,11);assert.equal(analyses,11);assert.equal(batch.status,'awaiting-review');assert.equal(batch.candidates.filter(c=>c.status==='duplicate').length,1);
 await assert.rejects(()=>runLiveBatch(dir,deps),/already exists/);assert.equal(searches,8);
}));
test('provider failure stops without retries and no model calls',async()=>temporary(async dir=>{
 await writeFile(resolve(dir,'permission.json'),JSON.stringify(permission));let calls=0;
 const batch=await runLiveBatch(dir,{provider:{discover:async()=>{calls++;throw Error('429');}},preflight:async()=>{},cache:async()=>{throw Error('Unexpected');},analyze:async()=>{throw Error('Unexpected');}});
 assert.equal(calls,1);assert.equal(batch.status,'stopped');assert.equal(batch.analysisCalls,0);
}));
test('temporal contract rejects single-frame movement, cross-window pairs, unsupported links and focal lengths',()=>{
 const samples=samplePlan(2.4,'mock-1');assert.equal(samples.length,12);assert(samples.every(s=>s.seconds>=0&&s.seconds<2.4));
 assert(validateAnalysis(mockAnalysis(1),samples));
 const single=mockAnalysis(1);single.findings.cameraMovement.frameIds=['f0'];assert.throws(()=>validateAnalysis(single,samples),/temporal evidence/);
 const gap=mockAnalysis(1);gap.evidence[0]!.endFrame='f4';assert.throws(()=>validateAnalysis(gap,samples),/within one/);
 const fabricated=mockAnalysis(1);fabricated.findings.lens={value:'Telephoto',confidence:'strong evidence',observationIds:['missing'],frameIds:['f0']};assert.throws(()=>validateAnalysis(fabricated,samples),/observation/);
 const exact=mockAnalysis(1);exact.prompt.framing='Use an 85mm lens.';assert.throws(()=>validateAnalysis(exact,samples),/focal/);
 const unsupported=mockAnalysis(1);unsupported.findings.cameraMovement.value='Verified dolly';assert.throws(()=>validateAnalysis(unsupported,samples));
});
test('mock queue is idempotent; review supports approve/reject/edit with stale edit protection',async()=>temporary(async dir=>{
 const batch=await seedMock(dir);assert.equal(batch.candidates.length,12);assert.equal(batch.requests,0);assert.equal(batch.analysisCalls,0);assert.equal((await seedMock(dir)).candidates.length,12);
 const input={id:'mock-1',version:1,action:'approve' as const,reviewer:'Local reviewer',notes:'Synthetic media and sample evidence reviewed.',rightsVerified:true};
 const approved=await reviewCandidate(dir,input);assert.equal(approved.status,'approved');assert.equal(approved.review?.digest,candidateDigest(approved));
 await assert.rejects(()=>reviewCandidate(dir,input),/changed/);
 const edited=await reviewCandidate(dir,{...input,version:2,action:'edit',analysis:mockAnalysis(2)});assert.equal(edited.status,'ready');assert.equal(edited.review,null);
 const rejected=await reviewCandidate(dir,{...input,version:3,action:'reject'});assert.equal(rejected.status,'rejected');
 await assert.rejects(()=>preparePublication(dir,dir),/Mock approvals/);assert.deepEqual(await readPublication(dir),[]);
}));
test('approval requires review attestation and rejects modified media',async()=>temporary(async dir=>{
 await seedMock(dir);const input={id:'mock-1',version:1,action:'approve' as const,reviewer:'Reviewer',notes:'Test review',rightsVerified:false};await assert.rejects(()=>reviewCandidate(dir,input),/permissions/);
 await writeFile(resolve(dir,'mock-1/video.webm'),'changed');await assert.rejects(()=>reviewCandidate(dir,{...input,rightsVerified:true}),/changed after analysis/);
}));
test('vision request uses twelve timestamped frames, no search-label leakage, and records provenance',async()=>temporary(async dir=>{
 const batch=await seedMock(dir);const c=batch.candidates[0]!;let count=0;
 await analyzeCandidate(c,dir,'private-test-key','configured-vision-model',async(url,init)=>{
  count++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(String(init?.body));assert.equal(body.store,false);assert.equal(body.max_output_tokens,6000);
  const images=body.input[1].content.filter((v:{type:string})=>v.type==='input_image');assert.equal(images.length,12);assert(!JSON.stringify(body).includes('local workflow fixture'));
  return Response.json({id:'response-test',status:'completed',usage:{total_tokens:100},output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(mockAnalysis(1))}]}]});
 });assert.equal(count,1);assert.equal(c.analysisProvenance?.kind,'openai');assert.equal(c.analysisProvenance?.model,'configured-vision-model');
}));
test('weak camera classification stays unverified and is excluded from discovery tags',async()=>temporary(async dir=>{
 const batch=await seedMock(dir);const clip=toClip(batch.candidates[0]!);assert.equal(clip.cameraMovement.status,'inferred');assert.equal(clip.cameraMovement.confidenceState,'weak evidence');assert.deepEqual(clip.categories.cameraMovement,[]);assert(clip.evidence[0]!.startSeconds<clip.evidence[0]!.endSeconds);
}));
test('only explicit verified live approval can produce public artifacts; expired permission blocks release',async()=>temporary(async root=>{
 const dir=resolve(root,'queue');const batch=await seedMock(dir);const old=batch.candidates[0]!;
 const c=structuredClone(old);c.id='pexels-1';c.metadata=metadata(1);c.asset!.file='pexels-1/video.mp4';c.asset!.poster='pexels-1/poster.jpg';c.samples.forEach(s=>{s.file=s.file.replace('mock-1','pexels-1');});c.analysisProvenance!.kind='openai';c.status='approved';c.review={reviewer:'Reviewer',notes:'Test fixture permission.',rightsVerified:true,reviewedAt:new Date().toISOString(),digest:candidateDigest(c)};
 batch.mode='live';batch.candidates=[c];batch.permission=permission;await mkdir(resolve(dir,'pexels-1'));await writeFile(resolve(dir,c.asset!.file),await readFile(resolve(dir,old.asset!.file)));await writeFile(resolve(dir,c.asset!.poster),await readFile(resolve(dir,old.asset!.poster)));await atomicJSON(resolve(dir,'batch.json'),batch);await writeFile(resolve(dir,'permission.json'),JSON.stringify(permission));
 assert.deepEqual(await readPublication(root),[]);assert.equal(await preparePublication(dir,root),1);assert.equal((await readPublication(root)).length,1);
 const manifest=JSON.parse(await readFile(resolve(root,'clip-publication/manifest.json'),'utf8'));manifest.permission.expiresAt='2020-01-01';await writeFile(resolve(root,'clip-publication/manifest.json'),JSON.stringify(manifest));await assert.rejects(()=>readPublication(root),/permission/);
 manifest.permission=permission;await writeFile(resolve(root,'clip-publication/manifest.json'),JSON.stringify(manifest));
 await reviewCandidate(dir,{id:c.id,version:c.version,action:'reject',reviewer:'Reviewer',notes:'Revoked after review.',rightsVerified:false},root);assert.deepEqual(await readPublication(root),[]);
}));
test('admin HTTP rejects cross-origin mutation, serves cached ranges and performs no ingestion',async()=>temporary(async root=>{
 const dir=resolve(root,'local-clip-ingestion/mock');await seedMock(dir);const middleware=reviewMiddleware(root);
 const server=createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end();}));await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try{
   const data=await (await fetch(base+'/dev/clip-ingestion/data')).json();assert.equal(data.batch.candidates.length,12);
   const response=await fetch(base+'/dev/clip-ingestion/media/mock-1/video.webm',{headers:{Range:'bytes=0-15'}});assert.equal(response.status,206);assert.equal((await response.arrayBuffer()).byteLength,16);
   assert.equal((await fetch(base+'/dev/clip-ingestion/media/mock-1/video.webm',{headers:{Range:'bytes=99999999-'}})).status,416);
   assert.equal((await fetch(base+'/dev/clip-ingestion/review',{method:'POST',headers:{Origin:'https://evil.test','Content-Type':'application/json','X-Framefield-Review':'1'},body:'{}'})).status,400);
   assert.equal((await fetch(base+'/dev/clip-ingestion/review',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'})).status,400);
   assert.equal((await readBatch(dir))!.analysisCalls,0);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
}));

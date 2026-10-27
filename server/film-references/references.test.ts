import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, request } from 'node:http';
import { readReferences, reviewReference, processingAllowed, publicationEligible } from './store';
import { filmReviewMiddleware } from './plugin';
import type { ReviewInput } from './types';
async function fixture(){const root=await mkdtemp(join(tmpdir(),'framefield-film-'));await mkdir(join(root,'docs/research'),{recursive:true});await copyFile('docs/research/film-discovery-2026-10-26.json',join(root,'docs/research/film-discovery-2026-10-26.json'));return root;}
test('twelve deduplicated metadata-only candidates; complete review cycle and separate permission gates',async()=>{
 const root=await fixture();try{
 const records=await readReferences(root);assert.equal(records.length,12);assert.equal(new Set(records.map(c=>c.sourceUrl)).size,12);assert.ok(records.every(c=>!processingAllowed(c)&&!publicationEligible(c)&&c.observations.length===0));
 let c=records[0]!;const input=(action:ReviewInput['action']):ReviewInput=>({id:c.id,version:c.version,action,reviewer:'Test reviewer',notes:'Test-only review evidence'});
 await assert.rejects(reviewReference(root,input('approve')),/display permission/);
 await assert.rejects(reviewReference(root,{...input('verify-rights'),scope:'display',evidence:'test',expiresAt:'2000-01-01'}),/future/);
 c=await reviewReference(root,{...input('verify-rights'),scope:'display',evidence:'Test-only link display authorization',expiresAt:'2099-01-01'});
 c=await reviewReference(root,input('approve'));assert.equal(c.status,'approved');assert.ok(publicationEligible(c));assert.equal(processingAllowed(c),false);
 c=await reviewReference(root,{...input('edit'),patch:{title:c.title,scene:c.scene,technique:c.technique,timestamp:5,display:c.display,prompt:{...c.prompt,detailed:'An exact edited prompt.'}}});assert.equal(c.status,'candidate');assert.equal(c.prompt.detailed,'An exact edited prompt.');
 await assert.rejects(reviewReference(root,{...input('reject'),version:1}),/changed/);
 for(const scope of ['download','edit','thirdPartyAnalysis'] as const)c=await reviewReference(root,{...input('verify-rights'),scope,evidence:'Test-only permission',expiresAt:'2099-01-01'});
 assert.ok(processingAllowed(c));c=await reviewReference(root,{...input('revoke-rights'),scope:'download'});assert.equal(processingAllowed(c),false);
 c=await reviewReference(root,input('reject'));assert.equal(c.status,'rejected');assert.equal((await readReferences(root))[0]!.status,'rejected');
 const concurrent=await Promise.allSettled([reviewReference(root,input('approve')),reviewReference(root,input('approve'))]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('HTTP queue is local, read-only by default, rejects cross-origin writes and has no processing/publication endpoints',async()=>{
 const root=await fixture();const middleware=filmReviewMiddleware(root);const server=createServer((req,res)=>middleware(req,res,()=>{res.statusCode=404;res.end();}));await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();assert.ok(address&&typeof address==='object');const base=`http://127.0.0.1:${address.port}`;
 try {const r=await fetch(base+'/admin/references/api/queue');assert.equal(r.status,200);const data=await r.json();assert.equal(data.candidates.length,12);assert.equal(data.processingEnabled,true);assert.equal(data.publishingEnabled,false);
 for(const endpoint of ['process','publish'])assert.equal((await fetch(base+'/admin/references/api/'+endpoint,{method:'POST'})).status,404);
 assert.equal((await fetch(base+'/admin/references/api/review',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json','X-Framefield-Review':'1'},body:'{}'})).status,400);
 assert.equal(await new Promise<number|undefined>((resolve,reject)=>{const req=request(base+'/admin/references/api/queue',{headers:{Host:'attacker.example'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end();}),400);
 assert.equal((await fetch(base+'/admin/references/api/review',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','X-Framefield-Review':'1'},body:JSON.stringify({id:data.candidates[0].id,version:1,action:'reject',reviewer:'HTTP test',notes:'Temporary fixture only'})})).status,200);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});

test('discovery adapters cap batches, deduplicate, and filter untrusted publishers without granting rights',async()=>{
 const {ResearchProvider,YouTubeDiscoveryProvider,discoverBatch}=await import('./discovery');const root=await fixture();
 try {const records=await readReferences(root);const report=await discoverBatch(records,new ResearchProvider(),0);assert.equal(report.results.length,12);
 await assert.rejects(discoverBatch([...records,records[0]!],new ResearchProvider(),0),/twelve/);
 const duplicate=await discoverBatch(records,{discover:async()=>[report.results[0]!]},0);assert.equal(duplicate.results.length,1);
 assert.throws(()=>new YouTubeDiscoveryProvider('',new Set()),/required/);
 let calls=0;
 const request:typeof fetch=async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,'https://www.googleapis.com');assert.equal(url.searchParams.has('key'),false);assert.equal((init?.headers as Record<string,string>)['X-Goog-Api-Key'],'test-key');calls++;
 return new Response(JSON.stringify(url.pathname.endsWith('/search')?{items:[{id:{videoId:'abcdefghijk'}},{id:{videoId:'lmnopqrstuv'}}]}:{items:[{id:'abcdefghijk',snippet:{title:'Official clip',channelId:'trusted',channelTitle:'Studio'},status:{privacyStatus:'public',embeddable:true,license:'youtube'}},{id:'lmnopqrstuv',snippet:{title:'Official impostor',channelId:'untrusted',channelTitle:'Studio Official'},status:{privacyStatus:'public',embeddable:true}}]}));};
 const live=await discoverBatch(records,new YouTubeDiscoveryProvider('test-key',new Set(['trusted']),request),0);assert.equal(calls,24);assert.equal(live.results.length,1);assert.equal(live.results[0]!.permissionStatus,'unverified');assert.equal(live.results[0]!.publisher,'Studio');assert.equal(live.processingEnabled,false);
 const failing=await discoverBatch(records,{discover:async()=>{throw Error('Provider unavailable');}},0);assert.equal(failing.errors.length,1);assert.equal(failing.results.length,0);
 }finally{await rm(root,{recursive:true,force:true});}
});

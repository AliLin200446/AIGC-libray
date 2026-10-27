import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createPublicReferenceHandler, ReferenceBudget } from './public-reference';
import { analyzeOpenAI } from './openai';
import { fixtureResponse } from '../src/library/reference/fixture';
import { PUBLIC_ANALYSIS_BYTES, ReferenceRequestError } from '../src/library/reference/errors';
const config = { apiKey:'server-test-only',model:'gpt-5.4-mini',timeoutMs:1000 };
const png = await sharp({create:{width:12,height:8,channels:3,background:'#888888'}}).png().toBuffer();
const request = (body: Buffer = png, options: {ip?:string;type?:string;signal?:AbortSignal} = {}) => new Request('https://framefield.example/api/reference-analysis', { method:'POST',headers:{'content-type':options.type??'image/png','x-reference-analysis':'1','x-forwarded-for':options.ip??'test-client'},body:new Uint8Array(body),...(options.signal?{signal:options.signal}:{}) });
const mockAdapter: typeof analyzeOpenAI = (bytes,mime,cfg,signal) => analyzeOpenAI(bytes,mime,cfg,signal,async()=>Response.json({status:'completed',model:'gpt-5.4-mini-test',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixtureResponse)}]}]}));
test('production readiness is safe and unavailable without a key; explicit POST only',async()=>{
 let calls=0;const handler=createPublicReferenceHandler({...config,apiKey:''},async(...args)=>{calls++;return mockAdapter(...args);});
 const ready=await handler(new Request('https://framefield.example/api/reference-analysis'));
 assert.equal((await ready.json()).status,'not-connected');assert.equal(ready.headers.get('cache-control'),'no-store');
 assert.equal((await handler(request())).status,503);assert.equal(calls,0);
 const configured=createPublicReferenceHandler(config,mockAdapter); const status=await configured(new Request('https://framefield.example/api/reference-analysis'));
 const text=await status.text(); assert(text.includes('ready')); assert(!text.includes(config.apiKey));
});
test('Vercel handler reuses the real decoder and validator with mocked upstream output',async()=>{
 const handler=createPublicReferenceHandler(config,mockAdapter);const response=await handler(request());
 assert.equal(response.status,200);const data=await response.json();assert.equal(data.analysis.provenance,'provider');assert.equal(data.analysis.cameraMovement.status,'unavailable');assert.equal(data.analysis.providerMetadata.model,'gpt-5.4-mini-test');assert(!JSON.stringify(data).includes(config.apiKey));
});
test('rejects oversized, unsupported, empty and cross-origin requests before upstream',async()=>{
 let calls=0;const handler=createPublicReferenceHandler(config,async(...args)=>{calls++;return mockAdapter(...args);});
 assert.equal((await handler(request(Buffer.alloc(PUBLIC_ANALYSIS_BYTES+1)))).status,413);
 assert.equal((await handler(request(png,{type:'video/mp4'}))).status,415);
 assert.equal((await handler(request(Buffer.alloc(0)))).status,400);
 const cross=request();cross.headers.set('origin','https://other.example');assert.equal((await handler(cross)).status,400);
 assert.equal(calls,0);
});
test('instance guard enforces active-client, global concurrency, attempt window and expiry',()=>{
 const budget=new ReferenceBudget();const first=budget.acquire('a',0);
 assert.throws(()=>budget.acquire('a',1),/rate-limited/);const second=budget.acquire('b',1);
 assert.throws(()=>budget.acquire('c',1),/rate-limited/);first();second();
 for(let i=0;i<4;i++)budget.acquire('a',2)();assert.throws(()=>budget.acquire('a',3),/rate-limited/);
 budget.acquire('a',600001)();
 const release=budget.acquire('d',700000);budget.acquire('d',800000)();release();
});
test('safe timeout, cancellation and validation errors retain no raw payload and never retry',async()=>{
 for(const code of ['timeout','cancelled','consistency_check','schema_validation','rate_limit'] as const){
 let calls=0;const handler=createPublicReferenceHandler(config,async()=>{calls++;throw new ReferenceRequestError(code);});
 const response=await handler(request());const body=await response.json();assert.equal(body.error.code,code);assert.equal(calls,1);
 }
 const controller=new AbortController();controller.abort();const handler=createPublicReferenceHandler(config,mockAdapter);
 assert.equal((await handler(request(png,{signal:controller.signal}))).status,499);
});

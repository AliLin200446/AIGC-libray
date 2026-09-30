import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import sharp from 'sharp';
import { analyzeOpenAI, parseResponse, prepareImage, requestBody, serverConfig } from './openai';
import { createReferenceMiddleware } from './api';
import { fixtureResponse } from '../src/library/reference/fixture';
import { MAX_REFERENCE_BYTES, ReferenceRequestError } from '../src/library/reference/errors';
import { normalizeServerAnalysis } from '../src/library/reference/validate';
import { createServerProvider } from '../src/library/reference/transport';
import { ReferenceAnalysisEngine } from '../src/library/reference/provider';
const config={apiKey:'server-only-test-secret',model:'gpt-5.4-mini',timeoutMs:1000};
const png=await sharp({create:{width:120,height:80,channels:3,background:'#c8c4b8'}}).png().toBuffer();
const response=(raw:unknown=fixtureResponse)=>({status:'completed',model:'gpt-5.4-mini-2026-03-17',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(raw)}]}],usage:{input_tokens:100,output_tokens:200,total_tokens:300}});
const mock:typeof fetch=async()=>Response.json(response(),{headers:{'x-request-id':'req_test'}});
async function serve(key:string,fetcher:typeof fetch,run:(url:string)=>Promise<void>){
  const middleware=createReferenceMiddleware({...config,apiKey:key},{fetcher});
  const server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}/api/reference-analysis`);}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
function post(url:string,body:Uint8Array=png,type='image/png',signal?:AbortSignal){return fetch(url,{method:'POST',headers:{'Content-Type':type,'X-Reference-Analysis':'1'},body:new Blob([new Uint8Array(body)]),...(signal?{signal}:{})});}
const rejectsCode=(code:string)=>(error:unknown)=>error instanceof ReferenceRequestError&&error.code===code;
test('server readiness and missing key never disclose credentials',async()=>{
  assert.equal(serverConfig({}).apiKey,'');
  await serve('',mock,async url=>{const status=await(await fetch(url)).json();assert.equal(status.status,'not-connected');const r=await post(url);assert.equal(r.status,503);assert.equal((await r.json()).error.code,'missing_key');});
  await serve(config.apiKey,mock,async url=>{const text=await(await fetch(url)).text();assert(text.includes('ready'));assert(!text.includes(config.apiKey));});
});
test('server rejects missing, unsupported, oversized and cross-origin requests',async()=>{
  let called=false;await serve(config.apiKey,async()=>{called=true;return mock('');},async url=>{
    for(const [bytes,mime,code] of [[new Uint8Array(),'image/png','missing_image'],[png,'image/svg+xml','unsupported_image'],[new Uint8Array(MAX_REFERENCE_BYTES+1),'image/png','image_too_large']] as const){const r=await post(url,bytes,mime);assert.equal((await r.json()).error.code,code);}
    const r=await fetch(url,{method:'POST',headers:{Origin:'https://unrelated.example','Content-Type':'image/png','X-Reference-Analysis':'1'},body:new Blob([new Uint8Array(png)])});assert.equal(r.status,400);assert(!called);
  });
});
test('decoded format wins over filename/MIME and JPEG PNG WEBP preserve dimensions',async()=>{
  for(const format of ['jpeg','png','webp'] as const){const bytes=await sharp(png).toFormat(format).toBuffer();const prepared=await prepareImage(bytes,`image/${format}`);assert.equal(prepared.input.format,format);assert.deepEqual(prepared.submitted,{width:120,height:80,format:'png'});}
  await assert.rejects(prepareImage(png,'image/jpeg'),rejectsCode('unsupported_image'));
  await assert.rejects(prepareImage(Buffer.from('broken'),'image/png'),rejectsCode('unsupported_image'));
});
test('OpenAI request uses canonical structured schema, explicit high detail, no storage or crop',()=>{
  const body=requestBody(config.model,'canonical instruction',png);
  assert.equal(body.model,config.model);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.text.format.type,'json_schema');
  const json=JSON.stringify(body);assert(json.includes('input_image'));assert(json.includes('data:image/png;base64,'));assert(json.includes('"detail":"high"'));assert(!json.includes(config.apiKey));assert(!json.includes('"$schema"'));assert(!json.includes('"const"'));
});
test('server publishes normalized result and bounded safe metadata, never raw provider output',async()=>{
  await serve(config.apiKey,mock,async url=>{const r=await post(url);assert.equal(r.status,200);const body=await r.json();assert(!body.output);assert(!JSON.stringify(body).includes(config.apiKey));const result=normalizeServerAnalysis(body.analysis);assert.equal(result.provenance,'provider');assert.equal(result.providerMetadata.model,'gpt-5.4-mini-2026-03-17');assert.equal(result.providerMetadata.providerRequestId,'req_test');assert.equal(result.providerMetadata.usage?.totalTokens,300);assert.deepEqual(result.providerMetadata.input,{width:120,height:80,format:'png'});assert(result.providerMetadata.requestTimestamp);assert.equal(result.captureMetadata,null);});
});
test('OpenAI response parsing rejects incomplete, refused and malformed output',()=>{
  assert.deepEqual(parseResponse(response()).raw,fixtureResponse);
  for(const raw of [{status:'incomplete',output:[]},{status:'completed',output:[]},{status:'completed',output:[{type:'message',content:[{type:'output_text',text:'not JSON'}]}]}])assert.throws(()=>parseResponse(raw),rejectsCode('malformed_output'));
  assert.throws(()=>parseResponse({output:[{type:'message',content:[{type:'refusal',refusal:'cannot process'}]}]}),rejectsCode('provider_refusal'));
});
test('existing schema and consistency guards reject invalid controls, capture claims and motion',async()=>{
  for(const kind of ['id','capture','motion'] as const){const raw=structuredClone(fixtureResponse);if(kind==='id')(raw.suggestedControls[0] as {controlId:string}).controlId='invented';if(kind==='capture')raw.lensTendency.evidence=['Captured at exactly 85mm.'];if(kind==='motion')(raw.cameraMovement as {status:string}).status='inferred';await assert.rejects(analyzeOpenAI(png,'image/png',config,new AbortController().signal,async()=>Response.json(response(raw))),rejectsCode(kind==='capture'?'consistency_check':'schema_validation'));}
});
test('provider rate limits, request failures, timeouts and cancellation have separate safe codes',async()=>{
  for(const [status,code] of [[429,'rate_limit'],[401,'provider_request'],[500,'provider_request']] as const)await assert.rejects(analyzeOpenAI(png,'image/png',config,new AbortController().signal,async()=>new Response('SECRET DIAGNOSTIC',{status})),rejectsCode(code));
  const waitForAbort:typeof fetch=async(_url,init)=>new Promise((_resolve,reject)=>{const signal=init!.signal!;if(signal.aborted)reject(new Error('aborted'));else signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});});
  await assert.rejects(analyzeOpenAI(png,'image/png',{...config,timeoutMs:15},new AbortController().signal,waitForAbort),rejectsCode('timeout'));
  const controller=new AbortController();controller.abort();await assert.rejects(analyzeOpenAI(png,'image/png',config,controller.signal,mock),rejectsCode('cancelled'));
});
test('disconnecting client aborts upstream provider request',async()=>{
  let started:()=>void=()=>{};const ready=new Promise<void>(resolve=>{started=resolve;});let aborted:()=>void=()=>{};const cancellation=new Promise<void>(resolve=>{aborted=resolve;});
  const upstream:typeof fetch=async(_url,init)=>{started();return new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>{aborted();reject(new Error('cancelled'));},{once:true});});};
  await serve(config.apiKey,upstream,async url=>{const controller=new AbortController();const pending=post(url,png,'image/png',controller.signal).catch(()=>null);await ready;controller.abort();await cancellation;await pending;});
});
test('client readiness, explicit submission and engine integrate using normalized HTTP results',async()=>{
  let posts=0;await serve(config.apiKey,mock,async url=>{
    const transport=createServerProvider(async(_url,init)=>{if(init?.method==='POST')posts++;return fetch(url,init);});
    const engine=new ReferenceAnalysisEngine(transport);assert.equal(engine.state.status,'not-connected');await engine.refreshAvailability();assert.equal(engine.state.status,'ready');assert.equal(posts,0);
    const result=await engine.analyzeReference({file:new Blob([new Uint8Array(png)],{type:'image/png'}),url:'blob:test',width:120,height:80,name:'local'});assert.equal(posts,1);assert.equal(result.status,'completed');if(result.status==='completed')assert.equal(result.result.providerMetadata.providerId,'openai');
  });
});
test('provider failure is an error, never fixture fallback or unsafe diagnostics',async()=>{
  await serve(config.apiKey,async()=>new Response('secret',{status:429}),async url=>{const transport=createServerProvider(async(_url,init)=>fetch(url,init));const engine=new ReferenceAnalysisEngine(transport);await engine.refreshAvailability();const result=await engine.analyzeReference({file:new Blob([new Uint8Array(png)],{type:'image/png'}),url:'blob:test',width:120,height:80,name:'local'});assert.equal(result.status,'error');assert.equal(result.result,null);assert.match(result.error??'',/rate-limited/);assert(!result.error?.includes('secret'));});
});

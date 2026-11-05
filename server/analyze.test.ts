import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import sharp from 'sharp';
import {createAnalyzeHandler,finishAnalysis,parseModelContent,MODEL} from './analyze';
import {EXAMPLE_RESULT} from '../src/analyze/simulated-provider';
import {mapAnalyzeHandoff} from '../src/playground/analyze-handoff';
const sample=()=>({...structuredClone(EXAMPLE_RESULT),simulated:false});
test('real analysis validates provenance and mapped controls without importing measured lens',()=>{
 const r=finishAnalysis(sample());assert.equal(r.model,MODEL);assert.equal(r.simulated,false);assert.equal(r.hints?.lensMm,undefined);
 const mapped=mapAnalyzeHandoff({result:r,movement:'dolly',prompt:'An authored reference prompt.'})!;
 assert.equal(mapped.controls.movement,'dolly');assert.equal(mapped.controls.focalLength,50);
 const edited=mapAnalyzeHandoff({result:r,movement:'dolly',prompt:'Edited reference prompt.',creativeComposition:'symmetrical',creativeFocal:35})!;assert.equal(edited.controls.composition,'symmetrical');assert.equal(edited.controls.focalLength,35);
 assert.equal(mapAnalyzeHandoff({result:EXAMPLE_RESULT,prompt:'test'}),null);
 assert.throws(()=>finishAnalysis({...sample(),summary:undefined}));
});
async function serve(key:string|undefined,mock:typeof fetch,fn:(base:string)=>Promise<void>){const handler=createAnalyzeHandler(key,mock);const s=createServer((req,res)=>{void handler(req,res);});await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));try{await fn(`http://127.0.0.1:${(s.address() as AddressInfo).port}`);}finally{s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}}
async function image(){const b=await sharp({create:{width:64,height:64,channels:3,background:'red'}}).png().toBuffer();const form=new FormData();form.append('image',new Blob([new Uint8Array(b)],{type:'image/png'}),'test.png');return form;}
test('handler validates images, sanitizes upstream errors, and rate limits',async()=>{
 let calls=0;const mock=(async()=>{calls++;return new Response('secret provider diagnostics',{status:401});}) as typeof fetch;
 await serve('test-only',mock,async base=>{
  const invalid=new FormData();invalid.append('image',new Blob(['bad'],{type:'image/png'}),'bad.png');assert.equal((await fetch(base,{method:'POST',body:invalid})).status,400);assert.equal(calls,0);
  const denied=await fetch(base,{method:'POST',body:await image()});assert.equal(denied.status,502);assert(!(await denied.text()).includes('secret'));
  assert.equal((await fetch(base,{method:'POST',body:await image()})).status,502);
  assert.equal((await fetch(base,{method:'POST',body:await image()})).status,429);
 });
});
test('handler returns validated real result and refuses malformed output',async()=>{
 let calls=0;await serve('test-only',(async()=>new Response(JSON.stringify({model:MODEL,choices:[{finish_reason:'stop',message:{content:JSON.stringify(calls++===0?sample():{})}}]}))) as typeof fetch,async base=>{
 const r=await fetch(base,{method:'POST',body:await image()});assert.equal(r.status,200);assert.equal((await r.json()).provider,'NVIDIA NIM');assert.equal((await fetch(base,{method:'POST',body:await image()})).status,502);
 });
});
test('missing key, network failure and upstream rate limit have actionable errors',async()=>{
 for(const [key,mock,status] of [[undefined,async()=>{throw Error();},503],['test',async()=>{throw Error();},502],['test',async()=>new Response('',{status:429}),429]] as const){await serve(key,mock as typeof fetch,async base=>assert.equal((await fetch(base,{method:'POST',body:await image()})).status,status));}
});

test('model JSON accepts surrounding whitespace and fenced answers without evaluating text',()=>{
 assert.deepEqual(parseModelContent(' \n```json\n{"version":1}\n```\n '),{version:1});
 assert.throws(()=>parseModelContent('not JSON'));
 assert.throws(()=>parseModelContent('{"a":1} {"b":2}'));
});

test('partial results retain valid evidence and disclose omitted malformed readings',()=>{
 const raw=sample();raw.readings.push({...raw.readings[0]!,id:'invalid',phrase:''});
 const r=finishAnalysis(raw);assert.equal(r.readings.length,raw.readings.length-1);assert.match(r.unmappedProperties![0]!,/omitted/);
 assert.throws(()=>finishAnalysis({...sample(),readings:[sample().readings[0]]}));
});

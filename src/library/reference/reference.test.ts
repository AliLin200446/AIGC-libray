import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeAnalysis, suggestedControlIds } from './validate';
import { AnalysisValidationError } from './schema';
import type { ProviderMetadata, ReconstructionControlId, ReferenceImage } from './types';
const metadata:ProviderMetadata={providerId:'test-adapter',model:null,contractVersion:'1',promptVersion:'1'};
const testImage:ReferenceImage={file:new Blob(),url:'blob:test',width:1200,height:800,name:'test'};
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { controls } from '../../controls';
import { applyPose, faceAnchor, projectedAnchor, stackPose } from '../instrument/camera';
import { addToStack, LocalReference, MAX_IMAGE_BYTES, validateImage } from './state';
import { fixtureAnalysis, fixtureResponse } from './fixture';
import { referenceProvider, ReferenceAnalysisEngine } from './provider';

test('image validation accepts JPG PNG WEBP and rejects video, unsupported, empty and oversized files',()=>{
  for(const type of ['image/jpeg','image/png','image/webp'])assert.doesNotThrow(()=>validateImage({type,size:200}));
  for(const type of ['video/mp4','image/svg+xml','text/plain',''])assert.throws(()=>validateImage({type,size:200}),/JPG/);
  assert.throws(()=>validateImage({type:'image/png',size:0}),/empty/);
  assert.throws(()=>validateImage({type:'image/png',size:MAX_IMAGE_BYTES+1}),/10 MB/);
});
test('replacement, failure, oversize decode and clear release object URLs exactly once',async()=>{
  const revoked:string[]=[];let sequence=0;
  const local=new LocalReference({create:()=>String(++sequence),revoke:url=>revoked.push(url),decode:async url=>{if(url==='3')throw new Error('decode');return {width:url==='4'?100000:1200,height:800};}});
  const blob=new Blob(['image']);
  await local.load(blob,'a');await local.load(blob,'b');assert.deepEqual(revoked,['1']);
  await assert.rejects(local.load(blob,'broken'));assert.equal(local.current?.name,'b');
  await assert.rejects(local.load(blob,'huge'),/megapixels/);assert.equal(local.current?.name,'b');
  local.clear();local.clear();assert.deepEqual(revoked,['1','3','4','2']);
});
test('late decode cannot resurrect a removed or replaced reference',async()=>{
  let sequence=0;const revoked:string[]=[];const finishes=new Map<string,(size:{width:number;height:number})=>void>();
  const local=new LocalReference({create:()=>String(++sequence),revoke:url=>revoked.push(url),decode:url=>new Promise(resolve=>finishes.set(url,resolve))});
  const first=local.load(new Blob(),'a');const second=local.load(new Blob(),'b');
  finishes.get('2')!({width:10,height:20});await second;finishes.get('1')!({width:10,height:20});assert.equal(await first,null);assert.equal(local.current?.name,'b');
  const third=local.load(new Blob(),'c');local.clear();finishes.get('3')!({width:10,height:20});assert.equal(await third,null);assert.equal(local.current,null);
  assert.deepEqual([...revoked].sort(),['1','2','3']);
});
test('no provider is configured and authored fixture cannot claim model provenance or motion',()=>{
  assert.equal(referenceProvider.available,false);assert.equal(fixtureAnalysis.provenance,'development-fixture');
  assert.equal(fixtureAnalysis.cameraMovement.status,'unavailable');assert.equal(fixtureAnalysis.cameraMovement.value,null);
  assert(fixtureAnalysis.limitations.some(text=>text.includes('NOT MODEL ANALYSIS')));
  for(const {controlId:id} of fixtureAnalysis.suggestedControls)assert(controls.some(control=>control.id===id&&control.category!=='camera'));
});
test('stack deduplicates controls and replaces lens while retaining composition intentions',()=>{
  let stack=addToStack([], 'rule-of-thirds');stack=addToStack(stack,'lens-24mm');stack=addToStack(stack,'lens-85mm');stack=addToStack(stack,'negative-space');stack=addToStack(stack,'rule-of-thirds');
  assert.deepEqual(stack,['lens-85mm','negative-space','rule-of-thirds']);
});
test('combined stack changes actual camera optics and framing, with documented placement precedence',()=>{
  const camera=new PerspectiveCamera(40,1.6,.05,100);
  applyPose(camera,stackPose(['rule-of-thirds','lens-85mm']));
  assert(Math.abs(camera.getFocalLength()-85)<.001);assert.equal(camera.position.z,10.2);
  const face=projectedAnchor(camera,faceAnchor);assert(Math.abs(face.x-1/3)<.04&&Math.abs(face.y-1/3)<.04,JSON.stringify(face));
  const combined=stackPose(['rule-of-thirds','negative-space','lens-85mm']);assert.equal(combined.target.x,.86);assert.equal(combined.target.y,1.10);
  applyPose(camera,stackPose(['rule-of-thirds','centered','lens-85mm']));assert(Math.abs(projectedAnchor(camera).x-.5)<.001);
  applyPose(camera,stackPose([]));assert(Math.abs(camera.getFocalLength()-50)<.001);assert.equal(camera.position.z,6);
});

test('strict response normalizes observations, evidence links, metadata and overlays',()=>{
  const result=normalizeAnalysis(fixtureResponse,metadata);
  assert.equal(result.captureMetadata,null);assert.equal(result.provenance,'provider');
  assert.equal(result.composition.length,4);assert.equal(result.providerMetadata.providerId,'test-adapter');
  assert.equal(result.composition[0]?.source,'test-adapter');
  assert.equal(result.overlays.anchor?.x,1/3);assert(result.overlays.negativeSpace);assert.equal(result.overlays.perspectiveLines?.length,2);
  assert(result.limitations.some(text=>text.includes('crop history')));
  const mutable=structuredClone(fixtureResponse);const owned=normalizeAnalysis(mutable,metadata);mutable.observations[0]!.statement='changed';assert.notEqual(owned.observations[0]?.statement,'changed');
});
const invalidCases:[string,(value:Record<string,unknown>)=>void][]=[
  ['unknown control',raw=>{(raw.suggestedControls as Record<string,unknown>[])[0]!.controlId='portrait-lens';}],
  ['unknown confidence',raw=>{(raw.lensTendency as Record<string,unknown>).confidenceState='87%';}],
  ['unsupported composition',raw=>{(raw.composition as Record<string,unknown>[])[0]!.controlId='cinematic';}],
  ['out of bounds point',raw=>{((raw.observations as Record<string,unknown>[])[0]!.anchor as Record<string,unknown>).x=1.2;}],
  ['overflowing region',raw=>{((raw.observations as Record<string,unknown>[])[0]!.region as Record<string,unknown>).width=.99;}],
  ['NaN coordinate',raw=>{((raw.observations as Record<string,unknown>[])[0]!.anchor as Record<string,unknown>).x=NaN;}],
  ['camera motion',raw=>{(raw.cameraMovement as Record<string,unknown>).status='inferred';(raw.cameraMovement as Record<string,unknown>).value='dolly';}],
  ['motion suggestion',raw=>{(raw.suggestedControls as Record<string,unknown>[])[0]!.controlId='pan';}],
  ['capture field',raw=>{raw.captureMetadata={focalLengthMm:85};}],
  ['numeric capture prose',raw=>{(raw.lensTendency as Record<string,unknown>).evidence=['This was shot at exactly 85mm.'];}],
  ['spelled capture prose',raw=>{(raw.lensTendency as Record<string,unknown>).evidence=['This used an eighty-five millimeter lens.'];}],
  ['motion prose',raw=>{(raw.perspective as Record<string,unknown>).value='The camera was dollying toward the subject.';}],
  ['unknown evidence link',raw=>{(raw.suggestedControls as Record<string,unknown>[])[0]!.evidenceObservationIds=['missing'];}],
  ['missing evidence link',raw=>{(raw.suggestedControls as Record<string,unknown>[])[0]!.evidenceObservationIds=[];}],
  ['inflated confidence',raw=>{(raw.suggestedControls as Record<string,unknown>[])[1]!.confidenceState='strong evidence';}],
  ['not reconstruction',raw=>{(raw.suggestedControls as Record<string,unknown>[])[1]!.reconstructionSuggestion=false;}],
  ['incompatible lens mapping',raw=>{(raw.suggestedControls as Record<string,unknown>[])[1]!.controlId='lens-24mm';}],
  ['unknown nested field',raw=>{(raw.lensTendency as Record<string,unknown>).focalLength=85;}],
  ['duplicate observations',raw=>{(raw.observations as Record<string,unknown>[])[1]!.id='subject';}],
  ['mismatched framing anchor',raw=>{(((raw.framing as Record<string,unknown>).value as Record<string,unknown>).anchor as Record<string,unknown>).x=.5;}],
  ['bokeh-only shortcut',raw=>{const depth=(raw.observations as Record<string,unknown>[])[2]!;depth.statement='The background has beautiful bokeh.';depth.evidence=['Shallow depth of field looks professional.'];}],
];
for(const [name,mutate] of invalidCases)test(`rejects ${name}`,()=>{
  const raw=structuredClone(fixtureResponse) as unknown as Record<string,unknown>;mutate(raw);assert.throws(()=>normalizeAnalysis(raw,metadata),AnalysisValidationError);
});
test('insufficient lens evidence stays unavailable and never maps to a lens control',()=>{
  const raw=structuredClone(fixtureResponse);raw.lensTendency={...raw.lensTendency,value:'insufficient',status:'unavailable',confidenceState:'insufficient evidence'};
  assert.throws(()=>normalizeAnalysis(raw,metadata),/supported inference/);
  raw.suggestedControls=raw.suggestedControls.filter(item=>!item.controlId.startsWith('lens-'));
  const result=normalizeAnalysis(raw,metadata);assert.equal(result.lensTendency.value,'insufficient');assert(!suggestedControlIds(result).some(id=>id.startsWith('lens-')));
});
test('validated suggestions require explicit stack selection and preserve canonical route IDs',()=>{
  const result=normalizeAnalysis(fixtureResponse,metadata);const stack:ReconstructionControlId[]=[];
  assert.deepEqual(stack,[]);const id=suggestedControlIds(result)[0]!;assert.equal(id,'rule-of-thirds');assert.deepEqual(addToStack(stack,id),['rule-of-thirds']);
  assert(controls.some(control=>`/library/${control.id}`===`/library/${id}`));
});
test('provider stays disconnected; configured test adapter follows ready/analyzing/completed',async()=>{
  const disconnected=new ReferenceAnalysisEngine(null);assert.equal(disconnected.state.status,'not-connected');assert.equal((await disconnected.analyzeReference(testImage)).status,'not-connected');
  const states:string[]=[];const engine=new ReferenceAnalysisEngine({id:'test-adapter',model:'test-only',analyzeImage:async()=>fixtureResponse},state=>states.push(state.status));
  assert.equal(engine.state.status,'ready');const completed=await engine.analyzeReference(testImage);assert.equal(completed.status,'completed');assert.deepEqual(states,['ready','analyzing','completed']);
  if(completed.status==='completed')assert.equal(completed.result.providerMetadata.model,'test-only');engine.reset();assert.equal(engine.state.status,'ready');
});
test('malformed output and transport failures never expose raw responses or secrets',async()=>{
  for(const analyzeImage of [async()=>({bad:'response'}),async()=>{throw new Error('secret-key-content');}]){
    const engine=new ReferenceAnalysisEngine({id:'test',model:null,analyzeImage});const result=await engine.analyzeReference(testImage);assert.equal(result.status,'error');assert.equal(result.result,null);assert(!result.error?.includes('secret-key-content'));
  }
});
test('reset cancels analysis and stale responses cannot become completed',async()=>{
  let resolve:(value:unknown)=>void=()=>{};let signal:AbortSignal|undefined;
  const engine=new ReferenceAnalysisEngine({id:'test',model:null,analyzeImage:(_image,abort)=>{signal=abort;return new Promise(done=>{resolve=done;});}});
  const pending=engine.analyzeReference(testImage);assert.equal(engine.state.status,'analyzing');engine.reset();assert(signal?.aborted);resolve(fixtureResponse);await pending;assert.equal(engine.state.status,'ready');assert.equal(engine.state.result,null);
});
test('canonical prompt unsupported-image example passes the same schema and semantic validation',async()=>{
  const prompt=await readFile(new URL('../../../docs/reference-analysis-prompt.md',import.meta.url),'utf8');
  const example=JSON.parse(prompt.split('```json\n')[1]!.split('\n```')[0]!);const result=normalizeAnalysis(example,metadata);assert.deepEqual(result.suggestedControls,[]);assert.equal(result.lensTendency.value,'insufficient');
});


test('overlapping provider runs publish only the newest validated result',async()=>{
  const pending:((value:unknown)=>void)[]=[];
  const engine=new ReferenceAnalysisEngine({id:'test',model:null,analyzeImage:()=>new Promise(resolve=>pending.push(resolve))});
  const first=engine.analyzeReference(testImage);const second=engine.analyzeReference(testImage);
  pending[1]!(fixtureResponse);await second;const latest=engine.state;
  pending[0]!({invalid:true});await first;assert.equal(engine.state,latest);assert.equal(engine.state.status,'completed');
});
test('unknown provider metadata and capture assertions cannot be smuggled into raw output',()=>{
  assert.throws(()=>normalizeAnalysis({...fixtureResponse,providerMetadata:metadata},metadata),/unexpected field/);
  assert.throws(()=>normalizeAnalysis({...fixtureResponse,provenance:'provider'},metadata),/unexpected field/);
});

test('confidence percentages and motion labels cannot bypass typed fields through prose',()=>{
  for(const text of ['87% confidence in this interpretation.','Confidence is 87%.','Dolly In','This image uses a pan.']){
    const raw=structuredClone(fixtureResponse);raw.perspective.value=text;assert.throws(()=>normalizeAnalysis(raw,metadata),AnalysisValidationError);
  }
});

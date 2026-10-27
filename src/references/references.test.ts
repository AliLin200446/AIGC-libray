import test from 'node:test';
import assert from 'node:assert/strict';
import { controls } from '../controls';
import { controlDatabase, draftControls } from '../controls/database';
import { controlFamilies, promoteControl, contentReady, emptyReadiness, focalParameter, goldControlIds, type ParameterSemantics } from '../controls/metadata';
import { ingestUrl,reviewReference,editReference,discoverReferences,exportApproved } from './curation';
import { validateReference,publicReferences } from './schema';
import approved from './approved.json';
import { realWorldReferences } from '../library/components/real-world-reference';
const ids=controls.map(c=>c.id);
const candidate=()=>ingestUrl('https://example.org/official-work',['dolly'],ids,'test-reference');
const ready=()=>({...candidate(),title:'Example metadata for testing',work:'Test work',creator:'Test creator',observation:'Foreground changes faster than background.',demonstrates:'Physical translation and parallax.',notToConfuseWith:'Optical zoom.',attribution:'Test creator / example.org'});
const approvedReference=()=>reviewReference(ready(),'approved','Human test reviewer','Metadata and external link only; no copied media.',ids);
test('taxonomy preserves all 12 canonical IDs, eight families and 36 unpublished draft slots',()=>{
 assert.equal(controls.length,12);assert(controls.every(c=>c.status==='canonical'));assert.equal(controlFamilies.length,8);assert.equal(draftControls.length,36);assert.equal(controlDatabase.length,48);assert.equal(new Set(controlDatabase.map(c=>c.id)).size,48);assert(draftControls.every(c=>c.status==='draft'&&!contentReady(c.readiness)));
 assert.equal(controls.find(c=>c.id==='dolly')!.goldPilot!.configuration!.direction,'in');assert.deepEqual(goldControlIds,['dolly','orbit','lens-24mm','lens-85mm','rule-of-thirds','negative-space']);assert.equal(controlDatabase.filter(c=>c.goldPilot).length,6);
});
test('continuous exploration metadata does not create research IDs; all parameter semantics are expressible',()=>{
 assert.deepEqual(focalParameter,{type:'continuous',unit:'mm',min:24,max:85,default:50,canonicalLandmarks:[24,35,50,85],step:.01,displayPrecision:0});
 assert(!controlDatabase.some(c=>c.id==='lens-62mm'));assert.equal(controlDatabase.find(c=>c.id==='lens-28mm')!.status,'draft');
 const composite:ParameterSemantics={type:'composite',components:{direction:{type:'directional',axes:['x','y','z'],default:[0,0,1]},mode:{type:'enum',options:['fixed','follow'],default:'fixed'},enabled:{type:'discrete',values:[false,true],default:false}}};assert.equal(composite.type,'composite');
});
test('content readiness is explicit and existing canonical status does not imply completed evidence',()=>{
 const flags=emptyReadiness();assert(!contentReady(flags));for(const key of Object.keys(flags))flags[key as keyof typeof flags]=true;assert(contentReady(flags));flags.referenceReady=false;assert(!contentReady(flags));assert.throws(()=>promoteControl(draftControls[0]!));assert.equal(promoteControl({...draftControls[0]!,readiness:{definitionReady:true,demoReady:true,referenceReady:true,translationReady:true,evaluationReady:true}}).status,'canonical');assert(controls.every(c=>!c.readiness.referenceReady&&!c.readiness.evaluationReady&&!c.readiness.translationReady));
});
test('manual URL ingest records metadata without downloading media; rejects unsafe URLs and control mappings',()=>{
 const r=candidate();assert.equal(r.verificationStatus,'candidate');assert.equal(r.rightsStatus,'metadata-only');assert.equal(r.sourceType,'manual-url');assert(!r.thumbnail&&!r.embedUrl);assert.equal(validateReference(r,ids).sourceUrl,r.sourceUrl);
 for(const source of ['javascript:alert(1)','file:///public/movie.mp4','http://example.org/video'])assert.throws(()=>ingestUrl(source,['dolly'],ids));
 assert.throws(()=>ingestUrl('https://example.org/',['invented-control'],ids));assert.throws(()=>validateReference({...r,controlIds:[]},ids));
});
test('rights, statuses, timestamps and required human evidence are enforced',()=>{
 const r=ready();assert.throws(()=>validateReference({...r,rightsStatus:'downloadable'},ids));assert.throws(()=>validateReference({...r,verificationStatus:'auto-approved'},ids));
 assert.throws(()=>validateReference({...r,verificationStatus:'approved'},ids));assert.throws(()=>reviewReference(candidate(),'approved','Human','Link only',ids));
 assert.throws(()=>validateReference({...r,thumbnail:'https://example.org/still.jpg'},ids));assert.throws(()=>validateReference({...r,embedUrl:'https://www.youtube.com/embed/test'},ids));assert.throws(()=>validateReference({...r,startTime:10,endTime:2},ids));
 const a=approvedReference();assert.equal(a.verificationStatus,'approved');assert.equal(a.review!.method,'human');
 for(const field of ['observation','demonstrates','notToConfuseWith'])assert.throws(()=>validateReference({...a,[field]:''},ids));
});
test('unreviewed and rejected references cannot render; approved records are eligible; edits invalidate approval',()=>{
 const a=approvedReference();assert.deepEqual(publicReferences([candidate(),reviewReference(ready(),'rejected','Human','Wrong evidence',ids)],'dolly',ids),[]);
 assert.equal(publicReferences([a],'dolly',ids).length,1);assert.equal(publicReferences([a],'orbit',ids).length,0);assert.equal(editReference(a,ids).verificationStatus,'candidate');assert.equal(editReference(a,ids).review,undefined);
 assert.equal(JSON.parse(exportApproved([a,candidate()],ids)).length,1);
});
test('discovery adapter can return only candidates even when it tries to claim approval',async()=>{
 const result=await discoverReferences({discoverReferences:async()=>[approvedReference()]},{id:'dolly',name:'Dolly In'},'official camera translation',ids);
 assert.equal(result[0]!.verificationStatus,'candidate');assert.equal(result[0]!.review,undefined);
});
test('production database is reviewed-only, unique and mapped to canonical IDs',()=>{
 const seen=new Set<string>();for(const record of approved){const r=validateReference(record,ids);assert.equal(r.verificationStatus,'approved');assert(!seen.has(r.id));seen.add(r.id);}
});
test('reusable public component is absent for candidates and renders evidence for approved links without media assets',()=>{
 class Node extends EventTarget {children:Node[]=[];textContent='';className='';href='';style:Record<string,string>={};append(...nodes:Node[]){this.children.push(...nodes);}setAttribute(){} }
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Node()}});
 try{assert.equal(realWorldReferences('dolly',[candidate()]),null);const node=realWorldReferences('dolly',[approvedReference()]) as unknown as Node;assert(node);const texts=(n:Node):string=>n.textContent+' '+n.children.map(texts).join(' ');for(const phrase of ['IN PRACTICE','OBSERVE','DEMONSTRATES','NOT TO CONFUSE WITH','VIEW SOURCE'])assert(texts(node).includes(phrase));}finally{if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');}
});

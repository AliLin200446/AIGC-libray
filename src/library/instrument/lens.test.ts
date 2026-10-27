import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { canonicalFocal, canonicalFocals, dragFocal, keyFocal, settleFocal, focalReadout, TickGate, focalCaption } from './lens';
import { homePose, lensPose, stackPose, applyPose, projectedAnchor, faceAnchor, interpolationBlend } from './camera';
import { createLensAudio } from './lens-audio';
test('default/reset share neutral 50mm; scale dragged left increases and right decreases',()=>{
 assert.equal(homePose().focalLength,50);assert.equal(dragFocal(50,-144),62);assert.equal(dragFocal(50,120),40);
 assert.equal(dragFocal(50,10000),24);assert.equal(dragFocal(50,-10000),85);assert.equal(dragFocal(50,-6),50.5);
});
test('only research focal values have routes; tiny release settle preserves intermediate exploration',()=>{
 for(const mm of canonicalFocals)assert.equal(canonicalFocal(mm),mm);
 assert.equal(canonicalFocal(62),undefined);assert.equal(canonicalFocal(49),undefined);assert.equal(canonicalFocal(51),undefined);
 assert.equal(settleFocal(50.15),50);assert.equal(settleFocal(50.3),50.3);assert.equal(focalReadout(61.8),'62 MM');
 assert.equal(focalCaption(62),'Compress the distance.');assert.equal(focalCaption(49),focalCaption(51));
});
test('keyboard arrows, larger shifts and endpoints remain within the supported range',()=>{
 assert.equal(keyFocal(50,'ArrowLeft'),49);assert.equal(keyFocal(50,'ArrowRight'),51);
 assert.equal(keyFocal(50,'ArrowRight',true),55);assert.equal(keyFocal(50,'ArrowLeft',true),45);
 assert.equal(keyFocal(50,'Home'),24);assert.equal(keyFocal(50,'End'),85);assert.equal(keyFocal(85,'ArrowRight'),85);assert.equal(keyFocal(24,'ArrowLeft'),24);assert.equal(keyFocal(50,'Tab'),undefined);
});
test('continuous physical focal/FOV and distance compensation preserve subject framing',()=>{
 const reference=new PerspectiveCamera(40,1.6,.05,100);applyPose(reference,homePose());
 for(const value of [24,25.4,35,49,50,51,62,84.8,85]){
  const pose=lensPose(value);const camera=new PerspectiveCamera(40,1.6,.05,100);applyPose(camera,pose);
  assert(Math.abs(camera.getFocalLength()-value)<1e-9);assert(Math.abs(camera.position.z-value*.12)<1e-9);
  assert(Math.abs(projectedAnchor(camera,faceAnchor).y-projectedAnchor(reference,faceAnchor).y)<1e-9);
  if(value<50)assert(camera.fov>reference.fov);if(value>50)assert(camera.fov<reference.fov);
 }
 assert.equal(lensPose(-1).focalLength,24);assert.equal(lensPose(100).focalLength,85);
});
test('Reference canonical stack uses the same pose and readout; reduced motion resolves immediately',()=>{
 for(const value of canonicalFocals){const pose=stackPose([`lens-${value}mm`]);assert.equal(pose.focalLength,value);assert(pose.position.equals(lensPose(value).position));assert.equal(focalReadout(pose.focalLength),`${value} MM`);}
 assert.equal(interpolationBlend(.016,true),1);assert(interpolationBlend(.016,false)<1);
});
test('audio requires interaction and tick crossings, differentiates canonical ticks and limits fast movement',()=>{
 const gate=new TickGate();assert.equal(gate.cross(51,0),undefined);gate.armed=true;gate.sync(50);
 assert.equal(gate.cross(51,100),'minor');assert.equal(gate.cross(51,200),undefined);assert.equal(gate.cross(51.2,300),undefined);
 assert.equal(gate.cross(62,320),'minor');assert.equal(gate.cross(70,325),undefined);assert.equal(gate.cross(85,400),'major');
 gate.sync(35.2);assert.equal(gate.cross(34.8,500),'major');gate.sync(24.2);assert.equal(gate.cross(24,600),'major');
 gate.sync(49.9);assert.equal(gate.cross(50,700),'major');
});
test('missing browser audio and mute never prevent focal updates',()=>{
 const audio=createLensAudio();assert.doesNotThrow(()=>{audio.unlock(50);audio.move(51);});assert.equal(audio.toggle(),false);assert.doesNotThrow(()=>{audio.unlock(51);audio.move(62);audio.dispose();});assert.equal(dragFocal(50,-144),62);
});

test('ruler pointer capture covers mouse/touch, stays locked while dragging, and renders external stack/reset state',async()=>{
 const {createLensRuler}=await import('./lens-ruler');
 class Node extends EventTarget {
  className=''; style:Record<string,string>={};dataset:Record<string,string>={};attrs=new Map<string,string>();children:Node[]=[];firstChild:{textContent:string}|null=null;hidden=false;href='';capture=0;
  set textContent(value:string){this.firstChild={textContent:value};}
  append(...nodes:Node[]){this.children.push(...nodes);}
  setAttribute(key:string,value:string){this.attrs.set(key,value);}
  setPointerCapture(id:number){this.capture=id;}
  focus(){}
  getBoundingClientRect(){return {left:0,width:1000};}
 }
 const prior=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>new Node()}});
 try{
  let value=50;const locks:boolean[]=[];const ruler=createLensRuler(()=>value,v=>{value=v;},v=>locks.push(v));
  const root=ruler.root as unknown as Node;const slider=root.children[1]!;
  const fire=(type:string,fields:Record<string,unknown>)=>slider.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),fields));
  for(const pointerType of ['mouse','touch']){
   value=50;fire('pointerdown',{pointerId:1,button:0,clientX:500,pointerType});assert.equal(slider.capture,1);assert.equal(ruler.dragging,true);
   fire('pointermove',{pointerId:2,clientX:20});assert.equal(value,50);
   fire('pointermove',{pointerId:1,clientX:356});assert.equal(value,62);assert.equal(ruler.dragging,true);
   fire('pointerup',{pointerId:1});assert.equal(ruler.dragging,false);
  }
  assert.deepEqual(locks,[true,false,true,false]);
  // Tick tapping uses the rendered scale, including when its animation trails the target.
  for(const pointerType of ['mouse','touch']){
   value=50;ruler.render(50);fire('pointerdown',{pointerId:8,button:0,clientX:320,pointerType});fire('pointerup',{pointerId:8});assert.equal(value,35);
   value=85;ruler.render(50);fire('pointerdown',{pointerId:9,button:0,clientX:320,pointerType});fire('pointermove',{pointerId:9,clientX:322});fire('pointerup',{pointerId:9});assert.equal(value,35);
   value=50;ruler.render(50);fire('pointerdown',{pointerId:10,button:0,clientX:320,pointerType});fire('pointercancel',{pointerId:10});assert.equal(value,50);
  }

  fire('pointerdown',{pointerId:3,button:0,clientX:500});fire('pointercancel',{pointerId:3});assert.equal(ruler.dragging,false);
  fire('keydown',{key:'Home',shiftKey:false});assert.equal(value,24);fire('keydown',{key:'End',shiftKey:false});assert.equal(value,85);
  ruler.render(stackPose(['lens-85mm']).focalLength);assert.equal(slider.attrs.get('aria-valuenow'),'85.00');assert.equal(root.children[0]!.firstChild!.textContent,'85 MM');assert.equal(root.children[3]!.href,'/library/lens-85mm');
  ruler.render(62);assert.equal(root.children[3]!.hidden,true);ruler.render(homePose().focalLength);assert.equal(slider.attrs.get('aria-valuenow'),'50.00');
  ruler.dispose();
 }finally{if(prior)Object.defineProperty(globalThis,'document',prior);else Reflect.deleteProperty(globalThis,'document');}
});

test('procedural audio is lazy, bounded, muted and cleans up its sources',()=>{
 let created=0,started=0,disconnected=0,closed=0;
 const prior=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');
 class AudioNode {frequency={value:0};Q={value:0};gain={value:0};onended?:()=>void;connect(){return this;}disconnect(){disconnected++;}start(){started++;}stop(){this.onended?.();}}
 class Context {
  state='running';sampleRate=48000;currentTime=0;destination={};
  constructor(){created++;}
  resume(){return Promise.resolve();}close(){closed++;return Promise.resolve();}
  createBuffer(_channels:number,length:number){return{getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return new AudioNode();}createBiquadFilter(){return new AudioNode();}createGain(){return new AudioNode();}
 }
 Object.defineProperty(globalThis,'AudioContext',{configurable:true,value:Context});
 try{
  const audio=createLensAudio();audio.move(51);assert.equal(created,0);assert.equal(started,0);
  audio.unlock(50);audio.move(51);assert.equal(created,1);assert.equal(started,1);
  for(let i=0;i<100;i++)audio.move(51);assert.equal(started,1);
  audio.toggle();audio.move(62);assert.equal(started,1);audio.dispose();assert.equal(closed,1);assert.equal(disconnected,3);
 }finally{if(prior)Object.defineProperty(globalThis,'AudioContext',prior);else Reflect.deleteProperty(globalThis,'AudioContext');}
});

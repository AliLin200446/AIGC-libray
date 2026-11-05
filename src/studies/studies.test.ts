import test from 'node:test';
import assert from 'node:assert/strict';
import {toStudiesModel} from './studies-adapter';
import {originalClips} from '../clips/originals';
import {curatedClips} from '../clips/curated';
import {toClipPage} from '../clips/clip-adapter';
import {studiesPageHTML} from './studies-page';
test('studies reuse registry IDs and clip diagrams, without inventing cleared film media',()=>{
 const registry=[...curatedClips.slice(0,2),...originalClips];const model=toStudiesModel(registry);
 assert.equal(model.studies.length,6);assert.equal(model.studies.filter(s=>s.source==='original').length,4);
 model.studies.forEach((s,i)=>{assert.equal(s.slug,registry[i]!.id);if(s.thumb.type==='schematic')assert.deepEqual(s.thumb.setup,toClipPage(registry[i]!).setup);});
 for(const s of model.studies.slice(0,2)){assert.equal(s.durationSec,undefined);assert.equal(s.awaitingFootage,true);assert.equal(s.thumb.type,'schematic');}
 for(const s of model.studies.slice(2)){assert.equal(s.durationSec,6);assert.equal(s.awaitingFootage,false);assert.equal(s.thumb.type,'render');}
 const html=studiesPageHTML(model);assert(!html.includes('— SEC'));assert(!html.includes('data-group="lens"'));assert.equal((html.match(/class="st-card"/g)??[]).length,6);
});

import {mountMosaic} from '../pixel/mosaic-heading';
test('mosaic has no active interval offscreen or with reduced motion, and disposes observers',()=>{
 const originals=new Map(['window','document','ResizeObserver','IntersectionObserver'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 let intersect:(entries:{isIntersecting:boolean}[])=>void=()=>{};
 let motion=()=>{};let live=0;let stopped=0;let removed=false;
 const reduce={matches:false,addEventListener:(_name:string,fn:()=>void)=>{motion=fn;},removeEventListener:()=>{}};
 const canvas={clientWidth:0,style:{},setAttribute:()=>{},remove:()=>{removed=true;}};
 Object.assign(globalThis,{
 window:{matchMedia:()=>reduce,setInterval:()=>{live++;return 1;},clearInterval:(id:number)=>{if(id)live=0;}},
 document:{hidden:false,createElement:()=>canvas,addEventListener:()=>{},removeEventListener:()=>{}},
 ResizeObserver:class {observe(){} disconnect(){stopped++;}},
 IntersectionObserver:class {constructor(fn:typeof intersect){intersect=fn;}observe(){}disconnect(){stopped++;}},
 });
 try{
  const dispose=mountMosaic({prepend:()=>{}} as unknown as HTMLElement,{scene:'tracking',animate:true});
  assert.equal(live,0);intersect([{isIntersecting:true}]);assert.equal(live,1);
  intersect([{isIntersecting:false}]);assert.equal(live,0);
  reduce.matches=true;motion();intersect([{isIntersecting:true}]);assert.equal(live,0);
  reduce.matches=false;motion();assert.equal(live,1);dispose();assert.equal(live,0);assert.equal(stopped,2);assert.equal(removed,true);
 }finally{for(const[k,v]of originals){if(v)Object.defineProperty(globalThis,k,v);else Reflect.deleteProperty(globalThis,k);}}
});

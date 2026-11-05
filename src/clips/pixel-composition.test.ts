import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import ts from 'typescript';
const code=ts.transpileModule(readFileSync(new URL('./pixel-composition.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test('decorations respect reduced motion, sleep offscreen/hidden, and release observers on route disposal',()=>{
 class Element extends EventTarget {
  children:Element[]=[]; classes=new Set<string>();removed=false;
  style={setProperty(){}};
  classList={add:(...names:string[])=>names.forEach(n=>this.classes.add(n)),remove:(n:string)=>this.classes.delete(n),toggle:(n:string,on:boolean)=>on?this.classes.add(n):this.classes.delete(n)};
  setAttribute(){} append(e:Element){this.children.push(e);} prepend(e:Element){this.children.unshift(e);} remove(){this.removed=true;}
 }
 const doc=Object.assign(new Element(),{hidden:false,createElementNS:()=>new Element()});
 const motion=Object.assign(new Element(),{matches:true});
 let intersect:(entries:{isIntersecting:boolean}[])=>void=()=>{};let disconnected=false;
 const exports={} as {pixelComposition:(host:Element,variant:string)=>()=>void};
 runInNewContext(code,{exports,document:doc,matchMedia:()=>motion,IntersectionObserver:class{constructor(cb:typeof intersect){intersect=cb;}observe(){}disconnect(){disconnected=true;}},requestAnimationFrame:()=>{throw Error('Decorations must not schedule RAF');}});
 const host=new Element(),dispose=exports.pixelComposition(host,'hero'),svg=host.children[0]!;
 intersect([{isIntersecting:true}]);assert(!svg.classes.has('is-running'));
 motion.matches=false;motion.dispatchEvent(new Event('change'));assert(svg.classes.has('is-running'));
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert(!svg.classes.has('is-running'));
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert(svg.classes.has('is-running'));
 intersect([{isIntersecting:false}]);assert(!svg.classes.has('is-running'));
 dispose();assert(disconnected);assert(svg.removed);assert(!host.classes.has('clip-pixel-host--hero'));
 intersect([{isIntersecting:false}]);motion.dispatchEvent(new Event('change'));assert(!svg.classes.has('is-running'));
});

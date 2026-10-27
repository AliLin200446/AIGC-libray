import { Euler, Plane, Ray, Vector3 } from 'three';
import type { DemonstrationPose } from './camera';
export const primitiveTypes=['block','plane','subject','frame'] as const;
export type PrimitiveType=typeof primitiveTypes[number];
export type ObjectRole=string;
export interface SceneAnchor {id:string;primitiveType:PrimitiveType;semanticRole:'subject'|'spatial';label:string;position:{x:number;y:number;z:number};rotationY:number;scale:number;rotation?:{x:number;y:number;z:number};scaleXYZ?:{x:number;y:number;z:number}}
export type ComposedWorld=Record<string,SceneAnchor>;
export type ObjectPatch={x?:number;y?:number;z?:number;rotationY?:number;scale?:number;rotationX?:number;rotationZ?:number;scaleX?:number;scaleY?:number;scaleZ?:number;label?:string};
export const sceneVersion=1,objectLimit=8,primarySubjectId='subject';
export function defaultWorld():ComposedWorld {
 const anchor=(id:string,primitiveType:PrimitiveType,x:number,z:number):SceneAnchor=>({id,primitiveType,semanticRole:primitiveType==='subject'?'subject':'spatial',label:`${primitiveType.toUpperCase()} 01`,position:{x,y:0,z},rotationY:0,scale:1});
 return{foreground:anchor('foreground','block',-.88,2),subject:anchor('subject','subject',0,0),background:anchor('background','plane',0,-8)};
}
const finite=(n:number,fallback:number)=>Number.isFinite(n)?n:fallback;
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function editAnchor(world:ComposedWorld,id:string,patch:ObjectPatch):ComposedWorld {
 const old=world[id];if(!old)return world;const object={...old,position:{...old.position}};
 object.scale=clamp(finite(patch.scale??old.scale,old.scale),.25,3);
 for(const axis of ['x','y','z'] as const)object.position[axis]=clamp(finite(patch[axis]??old.position[axis],old.position[axis]),axis==='y'?0:-14,axis==='y'?6:14);
 object.rotationY=((finite(patch.rotationY??old.rotationY,old.rotationY)%360)+360)%360;
 if(old.rotation||patch.rotationX!==undefined||patch.rotationZ!==undefined||patch.rotationY!==undefined){object.rotation={x:finite(patch.rotationX??old.rotation?.x??0,0),y:object.rotationY,z:finite(patch.rotationZ??old.rotation?.z??0,0)};}
 if(old.scaleXYZ||patch.scaleX!==undefined||patch.scaleY!==undefined||patch.scaleZ!==undefined){object.scaleXYZ={x:clamp(finite(patch.scaleX??patch.scale??old.scaleXYZ?.x??old.scale,1),.25,3),y:clamp(finite(patch.scaleY??patch.scale??old.scaleXYZ?.y??old.scale,1),.25,3),z:clamp(finite(patch.scaleZ??patch.scale??old.scaleXYZ?.z??old.scale,1),.25,3)};}
 if(patch.label!==undefined)object.label=Array.from(patch.label).filter(char=>char.charCodeAt(0)>=32).join('').trim().slice(0,32)||`${old.primitiveType.toUpperCase()} 01`;
 return{...world,[id]:object};
}
export function anchorPoint(world:ComposedWorld,id:string) {const o=world[id]!;return new Vector3(0,(o.primitiveType==='subject'?.9:o.primitiveType==='block'?.23:1.75)*(o.scaleXYZ?.y??o.scale),0).applyEuler(new Euler((o.rotation?.x??0)*Math.PI/180,o.rotationY*Math.PI/180,(o.rotation?.z??0)*Math.PI/180)).add(new Vector3().copy(o.position));}
/** One deterministic world unit is one meter. Camera poses never change objects. */
export function worldPose(base:DemonstrationPose,world:ComposedWorld):DemonstrationPose {
 const subject=world.subject!,fg=world.foreground;
 const referenceDistance=Math.max(6*subject.scale,fg?(fg.position.z+.4*fg.scale-subject.position.z+.35)*50/24:0);
 const factor=referenceDistance/6,anchor=anchorPoint(world,'subject');
 const position=new Vector3(base.position.x*factor,(base.position.y-.9)*factor,base.position.z*factor).add(anchor);
 const target=new Vector3(base.target.x*factor,(base.target.y-.9)*factor,base.target.z*factor).add(anchor);
 if(Math.abs(base.target.y-1.10)<.00001)target.y+=.66*(subject.scale-factor);
 return{position,target,focalLength:base.focalLength};
}
export function objectKey(key:string,shift=false):ObjectPatch|undefined {
 const step=shift?1:.25;
 if(key==='ArrowLeft')return{x:-step};if(key==='ArrowRight')return{x:step};
 if(key==='ArrowUp')return{z:-step};if(key==='ArrowDown')return{z:step};
 if(key==='[')return{rotationY:-5};if(key===']')return{rotationY:5};
}
export const groundSnap=(n:number,free=false)=>free?n:Math.round(n*4)/4;
export const rotationSnap=(n:number)=>Math.abs(n-Math.round(n/45)*45)<3?Math.round(n/45)*45:n;
export function groundIntersection(ray:Ray,y=0):Vector3|null {const point=ray.intersectPlane(new Plane(new Vector3(0,1,0),-y),new Vector3());return point&&Math.abs(point.x)<=14&&Math.abs(point.z)<=14?point:null;}
export function cameraPlacement(x:number,z:number,height:number,subject:Vector3){const position=new Vector3(clamp(x,-14,14),clamp(height,.3,2.5),clamp(z,-14,14));const offset=new Vector3(position.x-subject.x,0,position.z-subject.z);if(offset.length()<.75){if(offset.length()<.001)offset.z=1;offset.setLength(.75);position.x=subject.x+offset.x;position.z=subject.z+offset.z;}return{position,target:subject.clone()};}
export function cameraMetrics(position:Vector3,target:Vector3,subject:Vector3){const direction=target.clone().sub(position);return{distance:position.distanceTo(subject),yaw:Math.atan2(direction.x,-direction.z)*180/Math.PI,pitch:Math.atan2(direction.y,Math.hypot(direction.x,direction.z))*180/Math.PI};}
export const planPoint=(x:number,z:number)=>({x:(x+16)*6,y:(z+16)*6});
export const worldPoint=(x:number,y:number)=>({x:x/6-16,z:y/6-16});
export function createComposeState() {
 let world=defaultWorld(),enabled=false,selected:string|null=null,serial=1;
 return{get world(){return world;},get enabled(){return enabled;},get selected(){return selected;},
  snapshot(){return{version:sceneVersion,objects:Object.values(world),primarySubjectId};},
  setEnabled(value:boolean){enabled=value;if(!value)selected=null;},select(value:string|null){selected=enabled&&value&&(value==='camera'||world[value])?value:null;},
  create(type:PrimitiveType,point:{x:number;z:number}){if(Object.keys(world).length>=objectLimit)return null;const id=`object-${++serial}`;const labels=new Set(Object.values(world).map(o=>o.label));let number=1;while(labels.has(`${type.toUpperCase()} ${String(number).padStart(2,'0')}`))number++;const object:SceneAnchor={id,primitiveType:type,semanticRole:'spatial',label:`${type.toUpperCase()} ${String(number).padStart(2,'0')}`,position:{x:0,y:0,z:0},rotationY:0,scale:1};world=editAnchor({...world,[id]:object},id,point);selected=id;return id;},
  duplicate(id:string){const old=world[id];if(!old||Object.keys(world).length>=objectLimit)return null;const copyId=`object-${++serial}`;world={...world,[copyId]:{...structuredClone(old),id:copyId,semanticRole:'spatial',label:(old.label.slice(0,27)+' COPY'),position:{...old.position,x:clamp(old.position.x+.5,-14,14)}}};selected=copyId;return copyId;},
  restore(objects:SceneAnchor[]){world=Object.fromEntries(structuredClone(objects).map(o=>[o.id,o]));selected=null;serial=Math.max(serial,...objects.map(o=>Number(o.id.replace('object-',''))||0));},
  remove(id:string){if(id===primarySubjectId||!world[id])return false;const next={...world};delete next[id];world=next;if(selected===id)selected=null;return true;},
  edit(id:string,patch:ObjectPatch){world=editAnchor(world,id,patch);},reset(){world=defaultWorld();selected=null;}};
}

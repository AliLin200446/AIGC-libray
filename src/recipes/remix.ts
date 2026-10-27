import { Vector3 } from 'three';
import { controls } from '../controls';
import { lensPose,type DemonstrationPose } from '../library/instrument/camera';
import { anchorPoint,worldPose,type ComposedWorld } from '../library/instrument/compose-state';
import type { RecipeControl,RecipeCamera } from './types';
export function replaceFamily(stack:RecipeControl[],next:RecipeControl):RecipeControl[]{const category=controls.find(c=>c.id===next.controlId)!.category;return [...stack.filter(c=>controls.find(def=>def.id===c.controlId)!.category!==category),structuredClone(next)];}
const value=(item:RecipeControl,key:string)=>item.parameters[key]??controls.find(c=>c.id===item.controlId)?.parameters.find(p=>p.id===key)?.defaultValue;
export function remixDuration(stack:RecipeControl[]){return Math.max(1,...stack.filter(c=>controls.find(d=>d.id===c.controlId)?.category==='camera').map(c=>Number(value(c,'duration'))));}
/** Apply curated intent to the existing camera; the world is never altered to match an output. */
export function remixPose(stack:RecipeControl[],world:ComposedWorld,progress=1,cameraState:RecipeCamera|null=null,aspect=1.6,focalOverride?:number):DemonstrationPose {
 const subject=anchorPoint(world,'subject'),lens=[...stack].reverse().find(c=>c.controlId.startsWith('lens-'));
 const mm=focalOverride??(lens?Number(lens.controlId.slice(5,-2)):cameraState?.focalLength??50);
 let pose=worldPose(lensPose(mm),world);
 if(cameraState){pose={position:new Vector3(...cameraState.position),target:new Vector3(...cameraState.target),focalLength:mm};if(cameraState.framingLock!==false&&lens&&value(lens,'protocol')!=='fixed-viewpoint')pose.position.sub(subject).multiplyScalar(mm/cameraState.focalLength).add(subject);}
 else if(lens&&lens.parameters.protocol==='fixed-viewpoint')pose.position.copy(worldPose(lensPose(Number(value(lens,'baseline-focal-length'))),world).position);
 const up=new Vector3(0,1,0);
 for(const item of stack){let t=Math.max(0,Math.min(1,progress));if(value(item,'speed-profile')==='ease-in-out')t=t*t*(3-2*t);const forward=pose.target.clone().sub(pose.position).normalize(),right=forward.clone().cross(up).normalize();
  if(item.controlId==='dolly'){const distance=Number(value(item,'distance'))*t*(value(item,'direction')==='out'?-1:1);const travel=Math.min(distance,Math.max(.25,pose.position.distanceTo(subject)-.75));pose.position.addScaledVector(forward,travel);if(value(item,'subject-lock')===false)pose.target.addScaledVector(forward,travel);}
  if(item.controlId==='orbit'){const angle=Number(value(item,'arc'))*Math.PI/180*t*(value(item,'direction')==='counterclockwise'?1:-1);const offset=pose.position.clone().sub(subject);const radius=Number(value(item,'radius'));const horizontal=new Vector3(offset.x,0,offset.z).normalize().multiplyScalar(radius).applyAxisAngle(up,angle);pose.position.copy(subject).add(horizontal);pose.position.y=subject.y+offset.y;if(value(item,'subject-lock')!==false)pose.target.copy(subject);else pose.target.copy(pose.position).add(forward);}
  if(item.controlId==='pan'||item.controlId==='tilt'){const pan=item.controlId==='pan',angle=Number(value(item,'angle'))*Math.PI/180*t*((value(item,'direction')==='left'||value(item,'direction')==='up')?1:-1);pose.target.copy(pose.position).add(forward.applyAxisAngle(pan?up:right,angle).multiplyScalar(6));}
 }
 const composition=[...stack].reverse().find(c=>controls.find(d=>d.id===c.controlId)?.category==='composition');
 if(composition){let x=.5,y=.5;const anchor=subject.clone();if(composition.controlId==='rule-of-thirds'){const intersection=String(value(composition,'intersection'));x=intersection.endsWith('left')?1/3:2/3;y=intersection.startsWith('upper')?1/3:2/3;if(value(composition,'anchor')==='face-center')anchor.y+=.66*world.subject!.scale;}
  if(composition.controlId==='negative-space'){const side=value(composition,'side'),offset=Math.min(.32,Number(value(composition,'area-fraction'))/2);if(side==='right')x-=offset;if(side==='left')x+=offset;if(side==='top')y+=offset;if(side==='bottom')y-=offset;}
  const forward=anchor.clone().sub(pose.position).normalize(),right=forward.clone().cross(up).normalize(),vertical=right.clone().cross(forward).normalize(),distance=pose.position.distanceTo(anchor);const horizontalTangent=18/mm*Math.min(aspect,1);const verticalTangent=horizontalTangent/aspect;pose.target.copy(anchor).addScaledVector(right,(1-2*x)*distance*horizontalTangent).addScaledVector(vertical,(2*y-1)*distance*verticalTangent);
 }
 return pose;
}
export function remixLimitations(stack:RecipeControl[]){const notes=['Deterministic reconstruction of curated controls; this does not reproduce the generated video.'];if(stack.filter(c=>controls.find(d=>d.id===c.controlId)?.category==='composition').length>1)notes.push('The final composition in the stack sets the framing.');if(stack.filter(c=>c.controlId.startsWith('lens-')).length>1)notes.push('The final lens in the stack sets focal length.');if(stack.some(c=>c.controlId==='dolly'))notes.push('Dolly travel stops before crossing the subject.');if(stack.some(c=>c.controlId.startsWith('lens-')))notes.push('Depth of field, aperture and focus changes are not simulated.');if(stack.some(c=>c.controlId==='symmetrical'||c.controlId==='negative-space'))notes.push('Framing preserves the existing scene; it cannot guarantee structural symmetry or an empty background.');if(stack.filter(c=>controls.find(d=>d.id===c.controlId)?.category==='composition').length&&stack.some(c=>c.controlId==='pan'||c.controlId==='tilt'))notes.push('Composition takes priority over the final pan/tilt viewing direction.');return notes;}

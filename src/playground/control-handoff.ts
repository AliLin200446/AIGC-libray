import {controls} from '../controls';
import {initialControls,type DemoControls} from './controls';
import type {ReferenceMapping} from './mapping';
import type {ParamValues} from '../controls/control-model';
export function readControlMapping(search:string):ReferenceMapping|null {
 const q=new URLSearchParams(search);if(q.has('clip')||q.has('film'))return null;
 const c=controls.find(c=>c.id===q.get('control'));if(!c)return null;
 const values:ParamValues={};
 for(const p of c.parameters){const raw=q.get('param-'+p.id);values[p.id]=p.kind==='number'?raw!==null&&Number.isFinite(Number(raw))&&Number(raw)>=p.min&&Number(raw)<=p.max?Number(raw):p.defaultValue:p.kind==='boolean'?raw==='true'?true:raw==='false'?false:p.defaultValue:raw!==null&&p.options.includes(raw)?raw:p.defaultValue;}
 const value={...initialControls};const imported:(keyof DemoControls)[]=[];
 if(c.category==='lens'){value.focalLength=Number(c.id.slice(5,-2));imported.push('focalLength');}
 if(c.category==='composition'&&(c.id!=='rule-of-thirds'||values.intersection==='upper-left')&&(c.id!=='negative-space'||values.side==='right')&&(c.id!=='symmetrical'||values.axis==='vertical')){value.composition=c.id as DemoControls['composition'];imported.push('composition');}
 if(c.id==='dolly'&&values.direction==='in'&&values['subject-lock']!==false){value.movement='dolly';imported.push('movement');if(Number(values.distance)>=.25&&Number(values.distance)<=2){value.distance=Number(values.distance);imported.push('distance');}}
 if(c.category==='camera'&&Number(values.duration)>=1&&Number(values.duration)<=12&&Number.isInteger(values.duration)){value.duration=Number(values.duration);imported.push('duration');}
 return {reference:{id:c.id,title:c.name,backUrl:`/library/${c.id}`,basis:'curated'},controls:value,imported,notes:[`Authored control settings: ${c.parameters.map(p=>`${p.name}: ${values[p.id]}`).join('; ')}.`,`Transferred fields: ${imported.join(', ')||'none'}. Other fields use the existing workspace defaults.`, 'The focused workspace supports static/dolly-in, four composition presets, focal length, travel and timing only. Pan, tilt, orbit, alternate anchors/intersections, comparison protocols, blur/focus, speed profiles and geometry requirements are not reproduced.']};
}

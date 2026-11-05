import {controls} from './index';
import type {ControlDef,ParamValues} from './control-model';
import type {ControlSpecification} from './types';
const labels={camera:'Camera movement',lens:'Lens',composition:'Composition'};
export function studyLimitations(c:ControlSpecification):string {
 if(c.category==='lens')return 'Field of view and comparison protocol affect the preview. Aperture and focus are specified intent; depth of field is not simulated.';
 if(c.id==='centered')return 'Canonical subject placement is shown. Anchor choice and tolerance are evaluation targets, not simulated changes.';
 if(c.id==='symmetrical')return 'The existing scene is reframed. The axis guide updates; structural correspondence is specified intent. Geometry is not mirrored or rebuilt.';
 if(c.id==='rule-of-thirds')return 'Intersection and face/subject anchor affect framing. Object-center uses the subject proxy; tolerance is an evaluation target.';
 if(c.id==='negative-space')return 'Side and area affect framing. Detail level is specified intent; existing scene objects are preserved.';
 return c.id==='dolly'?'Physical translation at fixed focal length. Travel stops before crossing the subject.':'Physical camera motion in the canonical scene; not model output.';
}
export function controlSpec(c:ControlSpecification,v:ParamValues):string {
 if(c.id==='pan'||c.id==='tilt')return `${c.name} ${v.direction} ${v.angle}° over ${v.duration} s, ${v['speed-profile']==='ease-in-out'?'easing in and out':'at a constant speed'}.`;
 return `${c.name}: ${c.parameters.map(p=>`${p.name.toLowerCase()} ${typeof v[p.id]==='boolean'?(v[p.id]?'on':'off'):String(v[p.id]).replaceAll('-',' ')}${p.kind==='number'?' '+p.unit:''}`).join('; ')}.`;
}
export function toControlModels():ControlDef[]{return controls.map((c,i)=>({no:i+1,slug:c.id,family:c.category,familyLabel:labels[c.category],title:c.name,definition:c.shortDescription,intent:c.creativeIntent,revision:c.revision,status:c.status,media:c.media.join(' / '),behaviors:[...c.observableBehavior],params:c.parameters.map(p=>p.kind==='choice'?{kind:'choice',id:p.id,label:p.name,options:p.options.map(value=>({value,label:value.replaceAll('-',' ')})),default:p.defaultValue,hint:p.description}:p.kind==='boolean'?{kind:'toggle',id:p.id,label:p.name,default:p.defaultValue,hint:p.description}:{kind:'range',id:p.id,label:p.name,min:p.min,max:p.max,step:p.unit==='frame fraction'?.01:p.id==='aperture'?.1:p.id==='distance'||p.id==='radius'?.1:1,unit:p.unit,default:p.defaultValue,hint:p.description}),spec:v=>controlSpec(c,v),specNote:studyLimitations(c),failures:c.knownFailureModes.map(f=>f.description),evidence:[]}));}
export function controlComposeHref(c:ControlDef,v:ParamValues){return '/compose/workspace?'+new URLSearchParams({shot:'1',control:c.slug,...Object.fromEntries(Object.entries(v).map(([k,value])=>['param-'+k,String(value)]))});}

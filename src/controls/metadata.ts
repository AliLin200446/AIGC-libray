import type { ControlSpecification } from './types';
export const controlFamilies = ['CAMERA_MOVEMENT','LENS','CAMERA_ORIENTATION','COMPOSITION','FRAMING','FOCUS_DEPTH','CAMERA_BEHAVIOR','SUBJECT_CAMERA_RELATION'] as const;
export type ControlFamily = typeof controlFamilies[number];
export type ControlStatus = 'draft'|'canonical'|'experimental'|'deprecated';
export const referenceMedia = ['film','commercial','music-video','photography','educational','painting','other','cinematography-test'] as const;
export type ReferenceMedium = typeof referenceMedia[number];
export type ParameterSemantics =
 | {type:'continuous';unit:string;min:number;max:number;default:number;canonicalLandmarks?:readonly number[];step:number;displayPrecision:number}
 | {type:'discrete';values:readonly (number|string|boolean)[];default:number|string|boolean}
 | {type:'enum';options:readonly string[];default:string}
 | {type:'directional';axes:readonly string[];default:readonly number[];unit?:string}
 | {type:'composite';components:Readonly<Record<string,ParameterSemantics>>};
export const focalParameter = {type:'continuous',unit:'mm',min:24,max:85,default:50,canonicalLandmarks:[24,35,50,85],step:.01,displayPrecision:0} as const satisfies ParameterSemantics;
export interface ContentReadiness { definitionReady:boolean;demoReady:boolean;referenceReady:boolean;translationReady:boolean;evaluationReady:boolean }
export const emptyReadiness = ():ContentReadiness=>({definitionReady:false,demoReady:false,referenceReady:false,translationReady:false,evaluationReady:false});
export const contentReady = (value:ContentReadiness) => ['definitionReady','demoReady','referenceReady','translationReady','evaluationReady'].every(key=>value[key as keyof ContentReadiness]===true);
export interface ControlMetadata {
 family:ControlFamily;status:ControlStatus;preferredReferenceMedia:readonly ReferenceMedium[];readiness:ContentReadiness;
 parameterSemantics:Readonly<Record<string,ParameterSemantics>>;goldPilot?:{label:string;configuration?:Readonly<Record<string,string>>};
}
export const goldControlIds = ['dolly','orbit','lens-24mm','lens-85mm','rule-of-thirds','negative-space'] as const;
export const preferredMedia = (family:ControlFamily):readonly ReferenceMedium[] => family==='LENS'?['photography','cinematography-test','film']:family==='COMPOSITION'?['photography','film','painting']:family==='CAMERA_MOVEMENT'?['film','commercial','music-video','educational']:['film','educational'];
export function canonicalMetadata(control:ControlSpecification):ControlMetadata {
 const family=control.category==='camera'?'CAMERA_MOVEMENT':control.category==='lens'?'LENS':'COMPOSITION';
 const parameters:Record<string,ParameterSemantics>={};
 for(const p of control.parameters)parameters[p.id]=p.kind==='number'?{type:'continuous',unit:p.unit,min:p.min,max:p.max,default:p.defaultValue,step:.01,displayPrecision:2}:p.kind==='choice'?{type:'enum',options:p.options,default:p.defaultValue}:{type:'discrete',values:[false,true],default:p.defaultValue};
 if(family==='LENS')parameters['exploration-focal-length']=focalParameter;
 return {family,status:'canonical',preferredReferenceMedia:preferredMedia(family),parameterSemantics:parameters,
  readiness:{...emptyReadiness(),definitionReady:true,demoReady:true},
  ...(goldControlIds.some(id=>id===control.id)?{goldPilot:{label:control.id==='dolly'?'Dolly In':control.name,...(control.id==='dolly'?{configuration:{direction:'in'}}:{})}}:{})};
}
/** Explicit future promotion path. Legacy canonical IDs keep their identity, not a claim of readiness. */
export function promoteControl<T extends ControlMetadata>(control:T):T {
 if(control.status==='deprecated'||!contentReady(control.readiness))throw Error('Canonical promotion requires all five content readiness checks.');
 return {...control,status:'canonical'};
}

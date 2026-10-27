import { validateSchema, type Schema } from '../../src/library/reference/schema';
import { evidenceStates } from '../../src/library/reference/types';
import { fields, type Analysis, type Sample, type Permission } from './types';
export const vocab = {
  cameraMovement:['Dolly In / Out','Tracking','Pan','Tilt','Orbit','Crane','Handheld','Static'],
  framing:['Close-Up','Medium Shot','Wide Shot','Over-the-Shoulder'],
  composition:['Symmetrical','Centered','Rule of thirds','Negative space','Asymmetrical'],
  cameraAngle:['Eye-level','Low angle','High angle','Overhead'],
  lens:['Wide Angle','Normal','Telephoto'], lighting:['Backlight','Silhouette','Low-Key','High-Key'],
  subjectMotion:['Stationary','Walking','Running','Gesturing','Vehicle moving','Multiple movements'],
  movementSpeed:['Slow','Moderate','Fast','Variable'],
} as const;
const text: Schema={type:'string',minLength:1,maxLength:1200};
const array=(items:Schema,minItems=0,maxItems=20):Schema=>({type:'array',items,minItems,maxItems});
const object=(properties:Record<string,Schema>):Schema=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const ids=array({...text,maxLength:30});
export const analysisSchema=object({
  title:{...text,maxLength:120},description:{...text,maxLength:400},
  observations:array(object({id:{...text,maxLength:30},statement:text,frameIds:ids,confidence:{type:'string',enum:evidenceStates}}),1,24),
  findings:object(Object.fromEntries(fields.map(field=>[field,object({value:{anyOf:[{type:'string',enum:vocab[field]},{type:'null'}]},confidence:{type:'string',enum:evidenceStates},observationIds:ids,frameIds:ids})]))),
  evidence:array(object({startFrame:text,endFrame:text,cue:{type:'string',enum:['global translation','parallax','rotational flow','changing perspective','subject-relative movement']},description:text,observationIds:ids})),
  prompt:object({camera:text,framing:text,subject:text,lighting:text,continuity:text}),limitations:array(text,1,12),
});
export function validateAnalysis(raw:unknown,samples:Sample[]):Analysis {
  validateSchema(raw,analysisSchema); const a=raw as Analysis;
  const frames=new Map(samples.map(s=>[s.id,s]));
  if(frames.size!==samples.length||samples.length<2)throw Error('Distinct timestamped samples required.');
  const observations=new Map(a.observations.map(o=>[o.id,o]));
  if(observations.size!==a.observations.length)throw Error('Duplicate observation IDs.');
  const frameList=(ids:string[])=>{if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!frames.has(id)))throw Error('Invalid frame references.');};
  const observationList=(ids:string[])=>{if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!observations.has(id)))throw Error('Invalid observation references.');};
  for(const o of a.observations)frameList(o.frameIds);
  for(const e of a.evidence){
    const start=frames.get(e.startFrame),end=frames.get(e.endFrame);
    if(!start||!end||start.seconds>=end.seconds||start.window!==end.window)throw Error('Temporal evidence must compare distinct frames within one sampled window.');
    observationList(e.observationIds);
    if(!e.observationIds.some(id=>{const o=observations.get(id)!;return o.frameIds.includes(e.startFrame)&&o.frameIds.includes(e.endFrame);}))throw Error('Temporal evidence lacks a linked comparative observation.');
  }
  for(const field of fields){
    const f=a.findings[field];
    if(f.value===null){if(f.confidence!=='insufficient evidence')throw Error('Unavailable findings must have insufficient evidence.');continue;}
    frameList(f.frameIds);observationList(f.observationIds);
    if(f.frameIds.some(id=>!f.observationIds.some(o=>observations.get(o)!.frameIds.includes(id))))throw Error('Finding frames must be supported by linked observations.');
    if(['cameraMovement','subjectMotion','movementSpeed'].includes(field)) {
      if(!a.evidence.some(e=>f.frameIds.includes(e.startFrame)&&f.frameIds.includes(e.endFrame)&&e.observationIds.some(id=>f.observationIds.includes(id))))throw Error('Motion classification requires linked temporal evidence, never a single frame.');
    }
    if(f.confidence==='insufficient evidence')throw Error('Insufficient findings must remain unavailable.');
  }
  if(/\b\d+(?:\.\d+)?\s*(?:mm|millimeters?|millimetres?)\b/i.test(JSON.stringify(a)))throw Error('Estimated exact focal lengths are not supported.');
  return a;
}
export function validatePermission(raw:unknown,scope:keyof Pick<Permission,'discovery'|'cache'|'thirdPartyAnalysis'|'publicDisplay'>):Permission {
  validateSchema(raw,object({provider:{const:'pexels'},verifiedBy:text,reference:text,verifiedAt:text,expiresAt:text,discovery:{type:'boolean'},cache:{type:'boolean'},thirdPartyAnalysis:{type:'boolean'},publicDisplay:{type:'boolean'}}));
  const p=raw as Permission;
  if(!Number.isFinite(Date.parse(p.verifiedAt))||Date.parse(p.verifiedAt)>Date.now()||!Number.isFinite(Date.parse(p.expiresAt))||Date.parse(p.expiresAt)<=Date.now()||!p[scope])throw Error(`Current documented provider permission for ${scope} is required.`);
  return p;
}
export function promptText(a:Analysis){return Object.values(a.prompt).join(' ');}

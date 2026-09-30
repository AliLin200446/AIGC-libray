import { evidenceStates } from './types';

/** Small JSON Schema subset used for both the provider contract and local validation. */
export interface Schema {
  type?: 'object' | 'array' | 'string' | 'number' | 'null' | 'boolean';
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: false;
  items?: Schema;
  enum?: readonly unknown[];
  const?: unknown;
  anyOf?: Schema[];
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
}
const text: Schema = { type:'string',minLength:1,maxLength:1600 };
const list = (items:Schema,minItems=0,maxItems=32):Schema => ({type:'array',items,minItems,maxItems});
const object = (properties:Record<string,Schema>):Schema => ({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const enumeration = (values:readonly unknown[]):Schema => ({type:'string',enum:values});
const nullable = (schema:Schema):Schema => ({anyOf:[schema,{type:'null'}]});
const unit:Schema = {type:'number',minimum:0,maximum:1};
const point=object({x:unit,y:unit});
const region=object({x:unit,y:unit,width:unit,height:unit});
const confidence=enumeration(evidenceStates);
const ids=list({...text,maxLength:80});
const common = {evidence:list(text,1,12),evidenceObservationIds:ids,confidenceState:confidence,source:{const:'image'}};
const finding = (value:Schema,statuses:readonly string[]) => object({value,status:enumeration(statuses),...common});
export const compositionIds = ['centered','symmetrical','rule-of-thirds','negative-space'] as const;
export const lensIds = ['lens-24mm','lens-35mm','lens-50mm','lens-85mm'] as const;
export const referenceAnalysisSchema = {
  $schema:'https://json-schema.org/draft/2020-12/schema',
  ...object({
    mediaType:{const:'image'},
    observations:list(object({
      id:{...text,maxLength:80},category:enumeration(['subject-placement','symmetry','negative-space','depth','perspective','framing','architecture','foreground-background','other']),
      statement:text,evidence:list(text,1,12),confidenceState:confidence,region:nullable(region),anchor:nullable(point),
      lines:list(object({from:point,to:point}),0,8),
    }),0,32),
    composition:list(object({controlId:enumeration(compositionIds),status:enumeration(['inferred','unavailable']),...common}),0,4),
    lensTendency:finding(enumeration(['wide-like','normal-like','telephoto-like','insufficient']),['inferred','unavailable']),
    framing:finding(nullable(object({descriptor:enumeration(['close-up','medium','medium-full','full-body','wide-environmental','ambiguous']),anchor:nullable(point),subjectScale:nullable(unit)})),['inferred','unavailable']),
    perspective:finding(nullable(text),['observed','unavailable']),
    cameraMovement:finding({type:'null'},['unavailable']),
    suggestedControls:list(object({controlId:enumeration([...compositionIds,...lensIds]),reason:text,confidenceState:confidence,reconstructionSuggestion:{const:true},evidenceObservationIds:ids}),0,8),
    limitations:list(text,1,16),
  }),
};

export class AnalysisValidationError extends Error {
  constructor(path:string,reason:string) {super(`${path}: ${reason}`);this.name='AnalysisValidationError';}
}
export function validateSchema(value:unknown,schema:Schema,path='analysis'):void {
  const fail=(reason:string):never=>{throw new AnalysisValidationError(path,reason);};
  if(schema.anyOf){
    for(const option of schema.anyOf){try{validateSchema(value,option,path);return;}catch(error){if(!(error instanceof AnalysisValidationError))throw error;}}
    fail('does not match an allowed shape');
  }
  if('const' in schema && value!==schema.const)fail(`must equal ${String(schema.const)}`);
  if(schema.enum&&!schema.enum.includes(value))fail('unsupported vocabulary value');
  if(schema.type==='null'&&value!==null)fail('must be null');
  if(schema.type==='boolean'&&typeof value!=='boolean')fail('must be boolean');
  if(schema.type==='string'){
    if(typeof value!=='string')fail('must be text');
    const string=value as string;
    if(string.trim().length<(schema.minLength??0)||string.length>(schema.maxLength??Infinity))fail('invalid text length');
  }
  if(schema.type==='number'){
    if(typeof value!=='number'||!Number.isFinite(value)||value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity))fail('number outside permitted range');
  }
  if(schema.type==='array'){
    if(!Array.isArray(value))fail('must be an array');
    const array=value as unknown[];
    if(array.length<(schema.minItems??0)||array.length>(schema.maxItems??Infinity))fail('invalid array length');
    array.forEach((entry,i)=>validateSchema(entry,schema.items!,`${path}[${i}]`));
  }
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('must be a plain JSON object');
    const record=value as Record<string,unknown>;
    for(const key of Object.keys(record))if(!Object.hasOwn(schema.properties!,key))fail(`unexpected field ${key}`);
    for(const key of schema.required??[])if(!Object.hasOwn(record,key))fail(`missing field ${key}`);
    Object.entries(schema.properties!).forEach(([key,child])=>{if(Object.hasOwn(record,key))validateSchema(record[key],child,`${path}.${key}`);});
  }
}

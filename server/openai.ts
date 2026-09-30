import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { referenceAnalysisSchema, validateSchema, AnalysisValidationError } from '../src/library/reference/schema';
import { normalizeAnalysis } from '../src/library/reference/validate';
import { MAX_REFERENCE_BYTES, MAX_REFERENCE_PIXELS, ReferenceRequestError } from '../src/library/reference/errors';
import type { ProviderMetadata } from '../src/library/reference/types';

export const DEFAULT_MODEL='gpt-5.4-mini';
export interface ServerConfig { apiKey:string; model:string; timeoutMs:number }
export function serverConfig(env:Record<string,string|undefined>):ServerConfig {
  const duration=Number(env.OPENAI_REFERENCE_TIMEOUT_MS??60000);
  return {apiKey:env.OPENAI_API_KEY?.trim()??'',model:env.OPENAI_REFERENCE_MODEL?.trim()||DEFAULT_MODEL,timeoutMs:Number.isFinite(duration)?Math.max(1000,Math.min(duration,120000)):60000};
}
/** Adapt schema syntax only. The complete local schema remains authoritative. */
export function openAISchema(value:unknown):unknown {
  if(Array.isArray(value))return value.map(openAISchema);
  if(!value||typeof value!=='object')return value;
  const out:Record<string,unknown>={};
  for(const [key,entry] of Object.entries(value)){
    if(key==='$schema')continue;
    if(key==='const'){out.type=typeof entry;out.enum=[entry];}else out[key]=openAISchema(entry);
  }
  return out;
}
export async function prepareImage(bytes:Buffer,mime:string){
  if(!bytes.length)throw new ReferenceRequestError('missing_image');
  if(bytes.length>MAX_REFERENCE_BYTES)throw new ReferenceRequestError('image_too_large');
  if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new ReferenceRequestError('unsupported_image');
  const signature=bytes.subarray(0,12);
  const detected=signature.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':signature[0]===255&&signature[1]===216&&signature[2]===255?'image/jpeg':signature.toString('ascii',0,4)==='RIFF'&&signature.toString('ascii',8,12)==='WEBP'?'image/webp':null;
  if(detected!==mime)throw new ReferenceRequestError('unsupported_image');
  try {
    const decoder=sharp(bytes,{limitInputPixels:MAX_REFERENCE_PIXELS,failOn:'warning'});
    const metadata=await decoder.metadata();
    if(!['jpeg','png','webp'].includes(metadata.format??'')||`image/${metadata.format}`!==mime||(metadata.pages??1)>1)throw new ReferenceRequestError('unsupported_image');
    if(!metadata.width||!metadata.height||metadata.width*metadata.height>MAX_REFERENCE_PIXELS)throw new ReferenceRequestError('image_too_large');
    // Decode fully, apply display orientation, remove EXIF, and losslessly encode pixels.
    // No resize or crop. Never write uploaded data to disk.
    const {data,info}=await decoder.rotate().png().toBuffer({resolveWithObject:true});
    if(data.length>20*1024*1024)throw new ReferenceRequestError('image_too_large');
    return {data,input:{width:metadata.width,height:metadata.height,format:metadata.format as 'jpeg'|'png'|'webp'},submitted:{width:info.width,height:info.height,format:'png' as const},transformations:['EXIF orientation applied when present','metadata removed','lossless PNG encoding; no resize or crop']};
  }catch(error){
    if(error instanceof ReferenceRequestError)throw error;
    if(error instanceof Error&&/pixel limit/i.test(error.message))throw new ReferenceRequestError('image_too_large');
    throw new ReferenceRequestError('unsupported_image');
  }
}
export function requestBody(model:string,prompt:string,image:Buffer){
  return {
    model,store:false,reasoning:{effort:'low'},max_output_tokens:10000,
    input:[{role:'developer',content:[{type:'input_text',text:prompt}]},{role:'user',content:[
      {type:'input_text',text:'Analyze this still image using the evidence-first reference contract. Return structured output only. Valid suggestions: centered, symmetrical, rule-of-thirds, negative-space, lens-24mm, lens-35mm, lens-50mm, lens-85mm. Never suggest camera movement.'},
      {type:'input_image',image_url:`data:image/png;base64,${image.toString('base64')}`,detail:'high'},
    ]}],
    text:{format:{type:'json_schema',name:'reference_analysis',strict:true,schema:openAISchema(referenceAnalysisSchema)}},
  };
}
function record(value:unknown):Record<string,unknown> {return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
export function parseResponse(body:unknown){
  const response=record(body);const output=Array.isArray(response.output)?response.output:[];
  const content=output.flatMap(item=>{const message=record(item);return message.type==='message'&&Array.isArray(message.content)?message.content:[];});
  if(content.some(item=>record(item).type==='refusal'))throw new ReferenceRequestError('provider_refusal');
  if(response.status!=='completed')throw new ReferenceRequestError('malformed_output');
  const text=content.filter(item=>record(item).type==='output_text').map(item=>record(item).text);
  if(text.length!==1||typeof text[0]!=='string')throw new ReferenceRequestError('malformed_output');
  try{return {raw:JSON.parse(text[0]) as unknown,response};}catch{throw new ReferenceRequestError('malformed_output');}
}
export async function analyzeOpenAI(bytes:Buffer,mime:string,config:ServerConfig,signal:AbortSignal,fetcher:typeof fetch=fetch){
  if(!config.apiKey)throw new ReferenceRequestError('missing_key');
  if(signal.aborted)throw new ReferenceRequestError('cancelled');
  const started=Date.now();const image=await prepareImage(bytes,mime);
  const timeout=AbortSignal.timeout(config.timeoutMs);const combined=AbortSignal.any([signal,timeout]);
  const prompt=await readFile(new URL('../docs/reference-analysis-prompt.md',import.meta.url),'utf8');
  try{
    const response=await fetcher('https://api.openai.com/v1/responses',{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.apiKey}`},
      body:JSON.stringify(requestBody(config.model,prompt,image.data)),signal:combined,
    });
    if(response.status===429)throw new ReferenceRequestError('rate_limit');
    if(!response.ok)throw new ReferenceRequestError('provider_request');
    let envelope:unknown;try{envelope=await response.json();}catch{throw new ReferenceRequestError('malformed_output');}
    const {raw,response:provider}=parseResponse(envelope);
    try{validateSchema(raw,referenceAnalysisSchema);}catch(error){if(error instanceof AnalysisValidationError)throw new ReferenceRequestError('schema_validation');throw error;}
    const usage=record(provider.usage);
    const metadata:ProviderMetadata={providerId:'openai',model:typeof provider.model==='string'?provider.model:config.model,contractVersion:'1',promptVersion:'1',requestTimestamp:new Date(started).toISOString(),latencyMs:Date.now()-started,input:image.input,submitted:image.submitted,transformations:image.transformations,imageDetail:'high'};
    const requestId=response.headers.get('x-request-id');if(requestId)metadata.providerRequestId=requestId;
    if(['input_tokens','output_tokens','total_tokens'].every(key=>typeof usage[key]==='number'&&Number.isSafeInteger(usage[key])&&(usage[key] as number)>=0))metadata.usage={inputTokens:usage.input_tokens as number,outputTokens:usage.output_tokens as number,totalTokens:usage.total_tokens as number};
    try{return normalizeAnalysis(raw,metadata);}catch(error){if(error instanceof AnalysisValidationError)throw new ReferenceRequestError('consistency_check');throw error;}
  }catch(error){
    if(signal.aborted)throw new ReferenceRequestError('cancelled');
    if(timeout.aborted)throw new ReferenceRequestError('timeout');
    if(error instanceof ReferenceRequestError)throw error;
    throw new ReferenceRequestError('provider_request');
  }
}

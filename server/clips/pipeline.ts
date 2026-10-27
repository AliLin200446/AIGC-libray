import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { queries, pexelsAdapter } from './provider';
import { atomicJSON, readBatch, locked } from './store';
import { validatePermission } from './schema';
import { checkMediaTools, cacheAndSample } from './media';
import { analyzeCandidate } from './analysis';
import type { Batch, Candidate, Permission, ProviderAdapter, VideoMetadata } from './types';
export function candidate(metadata:VideoMetadata):Candidate {return {id:`${metadata.provider}-${metadata.providerId}`,metadata,status:'candidate',version:1,analysis:null,samples:[],asset:null,analysisProvenance:null,analysisAttempted:false,error:null,review:null,audit:[{action:'discovered',at:new Date().toISOString(),reviewer:'pipeline'}]};}
export async function permissionFile(directory:string,scope:Parameters<typeof validatePermission>[1]):Promise<Permission>{return validatePermission(JSON.parse(await readFile(resolve(directory,'permission.json'),'utf8')),scope);}
export interface PipelineDependencies { provider:ProviderAdapter; preflight:()=>Promise<void>; cache:(c:Candidate)=>Promise<void>; analyze:(c:Candidate)=>Promise<void> }
export async function runLiveBatch(directory:string,deps:PipelineDependencies) {
  return locked(directory,async()=>{
    if(await readBatch(directory))throw Error('Pilot batch already exists. No further discovery or automatic retries are allowed. Review the existing queue.');
    const permission=await permissionFile(directory,'discovery');validatePermission(permission,'cache');validatePermission(permission,'thirdPartyAnalysis');
    await deps.preflight();
    const batch:Batch={version:1,id:'pilot-001',mode:'live',status:'running',startedAt:new Date().toISOString(),candidates:[],requests:0,analysisCalls:0,errors:[],permission};
    const save=()=>atomicJSON(resolve(directory,'batch.json'),batch);await save();
    const seen=new Set<string>();const pools:VideoMetadata[][]=[];
    try {
      for(const query of queries){
        validatePermission(permission,'discovery');batch.requests++;await save();
        const results=await deps.provider.discover(query);pools.push(results);
      }
      // Round-robin selection prevents one successful query from consuming the pilot.
      for(let i=0;i<6&&batch.candidates.length<12;i++)for(const pool of pools){
        const m=pool[i];if(!m||batch.candidates.length>=12)continue;
        const keys=[`${m.provider}:${m.providerId}`,m.sourceUrl,new URL(m.videoUrl).origin+new URL(m.videoUrl).pathname];
        if(keys.some(key=>seen.has(key)))continue;keys.forEach(key=>seen.add(key));batch.candidates.push(candidate(m));
      }
      await save();
      const hashes=new Set<string>();
      for(const c of batch.candidates){
        try{
          validatePermission(permission,'cache');await deps.cache(c);
          if(!c.asset)throw Error('No cached media.');
          if(hashes.has(c.asset.sha256)){c.status='duplicate';c.error='Duplicate video content; not analyzed.';await save();continue;}hashes.add(c.asset.sha256);
          validatePermission(permission,'thirdPartyAnalysis');c.analysisAttempted=true;batch.analysisCalls++;await save();
          await deps.analyze(c);c.status='ready';
        }catch{c.status='failed';c.error='Preparation failed. Check provider access, local media tools, or analysis contract. No retry was made.';}
        await save();
      }
      batch.status='awaiting-review';if(batch.candidates.length<12)batch.errors.push(`Only ${batch.candidates.length} eligible unique candidates found; stopped without extra searches.`);
    }catch{batch.status='stopped';batch.errors.push('Discovery stopped after a provider or permission error. No retry or pagination was attempted.');}
    await save();return batch;
  });
}
export function liveDependencies(directory:string,env:Record<string,string|undefined>):PipelineDependencies {
  return {provider:pexelsAdapter(env.PEXELS_API_KEY??''),preflight:async()=>{if(!env.PEXELS_API_KEY||!env.OPENAI_API_KEY||!env.OPENAI_CLIP_MODEL)throw Error('Configure server-side PEXELS_API_KEY, OPENAI_API_KEY and OPENAI_CLIP_MODEL.');await checkMediaTools();},cache:c=>cacheAndSample(c,directory),analyze:c=>analyzeCandidate(c,directory,env.OPENAI_API_KEY!,env.OPENAI_CLIP_MODEL!)};
}

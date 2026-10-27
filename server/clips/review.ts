import { readFile } from 'node:fs/promises';
import type { Candidate } from './types';
import { resolve } from 'node:path';
import { atomicJSON, candidateDigest, locked, readBatch, verifiedAssets } from './store';
import { validateAnalysis, validatePermission } from './schema';
import { permissionFile } from './pipeline';
export interface ReviewInput {id:string;version:number;action:'approve'|'reject'|'edit';reviewer:string;notes:string;rightsVerified:boolean;analysis?:unknown}
export async function reviewCandidate(directory:string,input:ReviewInput,root=process.cwd()) {
  return locked(directory,async()=>{
    const batch=await readBatch(directory);if(!batch)throw Error('No pilot batch.');
    if(batch.status==='running')throw Error('Wait for ingestion to stop before review.');
    const c=batch.candidates.find(c=>c.id===input.id);if(!c)throw Error('Candidate not found.');
    if(c.version!==input.version)throw Error('This record changed. Refresh before editing.');
    if(typeof input.reviewer!=='string'||!input.reviewer.trim()||input.reviewer.length>120||typeof input.notes!=='string'||!input.notes.trim()||input.notes.length>2000)throw Error('Reviewer and review notes are required.');
    if(input.action==='edit'){
      if(!c.asset||!c.samples.length)throw Error('Cannot edit an analysis without sampled media.');
      c.analysis=validateAnalysis(input.analysis,c.samples);c.status='ready';c.review=null;
    }else if(input.action==='reject'){
      c.status='rejected';c.review=null;
    }else if(input.action==='approve'){
      if(!c.analysis||!c.asset||!c.analysisProvenance||!['ready','approved'].includes(c.status))throw Error('Only prepared, non-duplicate candidates can be approved.');
      validateAnalysis(c.analysis,c.samples);await verifiedAssets(directory,c);
      if(input.rightsVerified!==true)throw Error('Usage permissions and analysis must be reviewed before approval.');
      if(batch.mode==='live'){
        const p=await permissionFile(directory,'publicDisplay');validatePermission(p,'cache');validatePermission(p,'thirdPartyAnalysis');batch.permission=p;
        if(c.metadata.provider!=='pexels'||c.analysisProvenance.kind!=='openai')throw Error('Live publication requires actual provider and model provenance.');
      }
      c.status='approved';c.review={reviewer:input.reviewer.trim(),notes:input.notes.trim(),rightsVerified:true,reviewedAt:new Date().toISOString(),digest:candidateDigest(c)};
    }else throw Error('Unknown review action.');
    c.version++;c.audit.push({action:input.action,at:new Date().toISOString(),reviewer:input.reviewer.trim(),notes:input.notes.trim()});
    // A later edit or rejection revokes this clip from any locally prepared release.
    // Do this before changing the queue so a failed invalidation cannot leave a stale public approval.
    if(batch.mode==='live' && input.action!=='approve') {
      const path=resolve(root,'clip-publication/manifest.json');
      let manifest:{candidates:Candidate[]}|null=null;
      try{manifest=JSON.parse(await readFile(path,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
      if(manifest){manifest.candidates=manifest.candidates.filter(entry=>entry.id!==c.id);await atomicJSON(path,manifest);}
    }
    await atomicJSON(resolve(directory,'batch.json'),batch);return c;
  });
}

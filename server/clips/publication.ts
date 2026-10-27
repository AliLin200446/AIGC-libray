import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ClipReference, ClipCategories } from '../../src/clips/types';
import type { Finding } from '../../src/library/reference/types';
import type { ControlId } from '../../src/controls/types';
import { validateCandidate, readBatch, verifiedAssets, candidateDigest, locked } from './store';
import { fields, type Candidate, type Permission } from './types';
import { promptText, validateAnalysis, validatePermission } from './schema';
import { permissionFile } from './pipeline';
import { providerUrl } from './provider';
export function toClip(c:Candidate):ClipReference {
  if(!c.analysis||!c.asset)throw Error('Prepared candidate required.');
  const a=c.analysis;
  const finding=(key:typeof fields[number]):Finding<string>=>{
    const f=a.findings[key];return {value:f.value,status:f.value===null?'unavailable':'inferred',confidenceState:f.confidence,evidenceObservationIds:f.observationIds,evidence:f.observationIds.map(id=>a.observations.find(o=>o.id===id)!.statement),source:'Ordered sampled video windows; unverified inference, not capture metadata.'};
  };
  const category=(key:typeof fields[number])=>{const f=a.findings[key];return f.value&&['strong evidence','moderate evidence'].includes(f.confidence)?[f.value]:[];};
  const movement=category('cameraMovement');
  const map:Record<string,ControlId>={'Dolly In / Out':'dolly',Pan:'pan',Tilt:'tilt',Orbit:'orbit',Symmetrical:'symmetrical'};
  const composition=[...category('framing'),...(category('composition').includes('Symmetrical')?['Symmetrical']:[])];
  return {id:c.id,title:a.title,description:a.description,videoUrl:`/clip-media/${c.asset.file}`,posterUrl:`/clip-media/${c.asset.poster}`,duration:c.metadata.duration,
    categories:{cameraMovement:movement,composition,lens:category('lens'),lighting:category('lighting')} as ClipCategories,
    controlIds:[...movement,...composition].flatMap(value=>map[value]?[map[value]!]:[]),
    cameraMovement:finding('cameraMovement'),framing:finding('framing'),cameraAngle:finding('cameraAngle'),lens:finding('lens'),lighting:finding('lighting'),subjectMotion:finding('subjectMotion'),movementSpeed:finding('movementSpeed'),prompt:promptText(a),
    source:{title:'Video provided by Pexels',url:c.metadata.sourceUrl,attribution:`Video by ${c.metadata.creator} on Pexels`,kind:'licensed'},
    license:{name:c.metadata.licenseName,url:c.metadata.licenseUrl,notes:'Usage permissions reviewed for FRAMEFIELD. Camera and lens classifications remain unverified interpretations of sampled frames.'},
    observations:a.observations.map(o=>({id:o.id,category:'other',statement:o.statement,evidence:o.frameIds.map(id=>{const s=c.samples.find(f=>f.id===id)!;return `${id} at ${s.seconds}s (window ${s.window})`;}),confidenceState:o.confidence,region:null,anchor:null,lines:[]})),
    limitations:a.limitations,inferences:fields.map(finding),confidence:a.findings.cameraMovement.confidence,
    evidence:a.evidence.map(e=>({startSeconds:c.samples.find(s=>s.id===e.startFrame)!.seconds,endSeconds:c.samples.find(s=>s.id===e.endFrame)!.seconds,cue:e.cue})),
  };
}
interface Publication {version:1;permission:Permission;candidates:Candidate[]}
export async function readPublication(root=process.cwd()) {
  const dir=resolve(root,'clip-publication');let raw:string;
  try{raw=await readFile(resolve(dir,'manifest.json'),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return [];throw e;}
  const pub=JSON.parse(raw) as Publication;
  if(pub.version!==1||!Array.isArray(pub.candidates)||pub.candidates.length>12||new Set(pub.candidates.map(c=>c.id)).size!==pub.candidates.length)throw Error('Invalid publication manifest.');
  validatePermission(pub.permission,'publicDisplay');validatePermission(pub.permission,'cache');validatePermission(pub.permission,'thirdPartyAnalysis');
  const result=[];
  for(const c of pub.candidates){
    validateCandidate(c);
    if(c.status!=='approved'||c.metadata.provider!=='pexels'||c.analysisProvenance?.kind!=='openai'||!c.analysis||c.review?.digest!==candidateDigest(c))throw Error('Unapproved or mock clip cannot be published.');
    providerUrl(c.metadata.sourceUrl,'page');providerUrl(c.metadata.creatorUrl,'page');providerUrl(c.metadata.videoUrl,'media');providerUrl(c.metadata.thumbnailUrl,'media');
    if(c.metadata.licenseName!=='Pexels License'||c.metadata.licenseUrl!=='https://www.pexels.com/license/')throw Error('Invalid provider license metadata.');
    validateAnalysis(c.analysis,c.samples);const assets=await verifiedAssets(dir,c);result.push({clip:toClip(c),...assets});
  }
  return result;
}
/** Explicit release preparation only. Approval and ordinary browsing never call this. */
export async function preparePublication(directory:string,root=process.cwd()) {
  return locked(directory,async()=>{
    const batch=await readBatch(directory);if(!batch||batch.mode!=='live'||batch.status==='running')throw Error('Only a stopped live pilot can prepare a release. Mock approvals stay local.');
    const permission=await permissionFile(directory,'publicDisplay');validatePermission(permission,'cache');validatePermission(permission,'thirdPartyAnalysis');
    const candidates=batch.candidates.filter(c=>c.status==='approved');if(!candidates.length)throw Error('No approved clips.');
    // Use an isolated staged root; validation must succeed before replacing the release snapshot.
    const stage=resolve(root,`.clip-release-${randomUUID()}`);await mkdir(resolve(stage,'clip-publication'),{recursive:true});
    try{
      for(const c of candidates){const assets=await verifiedAssets(directory,c);await mkdir(resolve(stage,'clip-publication',c.id),{recursive:true});await writeFile(resolve(stage,'clip-publication',c.asset!.file),assets.video);await writeFile(resolve(stage,'clip-publication',c.asset!.poster),assets.poster);}
      await writeFile(resolve(stage,'clip-publication/manifest.json'),JSON.stringify({version:1,permission,candidates},null,2));await readPublication(stage);
      // First pilot only: never silently overwrite an existing prepared release.
      await rename(resolve(stage,'clip-publication'),resolve(root,'clip-publication'));
    }finally{await rm(stage,{recursive:true,force:true});}
    return candidates.length;
  });
}

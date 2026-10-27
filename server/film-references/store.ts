import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { scopes, type FilmReference, type ReviewInput, type Scope } from './types';
interface Seed {
 id:string;film:string;year:number;director:string;cinematographers:string[];videoTitle:string;sourceUrl:string;publisher:string;thumbnailUrl:string|null;
 sceneDescription:string;cameraTechnique:{value:string};embedding:{embedUrl:string|null;technicalStatus:string};evidence:{kind:string;url:string}[];limitations:string[];
}
export function permissionActive(c: FilmReference, scope: Scope, now=Date.now()) {
 const g=c.permissions[scope];return !!g && !!g.evidence.trim() && !!g.reviewer.trim() && Date.parse(g.expiresAt)>now;
}
export function processingAllowed(c: FilmReference) { return (['download','edit','thirdPartyAnalysis'] as const).every(s=>permissionActive(c,s)); }
export function displayAllowed(c:FilmReference) { return c.display==='local-video' ? permissionActive(c,'store')&&permissionActive(c,'display') : c.display==='platform-embed' ? permissionActive(c,'embed')&&c.embedMetadataAvailable&&!!c.embedUrl : permissionActive(c,'display'); }
export function publicationEligible(c:FilmReference) { return c.status==='approved'&&displayAllowed(c)&&(c.display!=='local-video'||permissionActive(c,'host')); }
export async function readReferences(root=process.cwd()):Promise<FilmReference[]> {
 try{const records=JSON.parse(await readFile(join(root,'local-film-references/queue.json'),'utf8')) as FilmReference[];records.forEach(syncMediaPermissions);return records;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const report=JSON.parse(await readFile(join(root,'docs/research/film-discovery-2026-10-26.json'),'utf8')) as {candidates:Seed[]};
 return report.candidates.map(s=>({id:s.id,version:1,film:s.film,year:s.year,director:s.director,cinematographers:s.cinematographers,title:s.videoTitle,sourceUrl:s.sourceUrl,publisher:s.publisher,thumbnailUrl:s.thumbnailUrl,embedUrl:s.embedding.embedUrl,embedMetadataAvailable:s.embedding.technicalStatus==='oembed-returned-player',scene:s.sceneDescription,technique:s.cameraTechnique.value,timestamp:null,display:'external-link',status:'candidate',prompt:{short:`Explore ${s.cameraTechnique.value.toLowerCase()}.`,detailed:'Maintain readable subject placement and spatial continuity. Establish the camera path, framing, and subject motion explicitly before generation. This research draft requires temporal review of the reference.',controls:JSON.stringify({cameraMovement:null,framing:null,lens:null,lighting:null,subjectMotion:null,confidence:'insufficient evidence'},null,2),negative:'No unintended cuts, abrupt focal-length changes, or unexplained camera jumps.'},promptBasis:'authored-research-draft',observations:[],inferences:[{value:s.cameraTechnique.value,status:'inferred',evidence:s.evidence.map(e=>e.url),evidenceObservationIds:[],confidenceState:'insufficient evidence',source:'Discovery research; unverified for selected excerpt'}],evidence:s.evidence,limitations:s.limitations,permissions:{},audit:[]}));
}
const locks=new Map<string,Promise<unknown>>();
export function required(value:unknown,label:string,max=12000):string {if(typeof value!=='string'||!value.trim()||value.length>max)throw Error(`${label} is required (maximum ${max} characters).`);return value.trim();}
export async function reviewReference(root:string,input:ReviewInput):Promise<FilmReference> {
 return updateReferences(root,async records=>{
 const c=records.find(r=>r.id===input.id);if(!c)throw Error('Unknown reference.');
 if(c.version!==input.version)throw Error('This record changed. Refresh before reviewing.');
 const reviewer=required(input.reviewer,'Reviewer',120);const notes=required(input.notes,'Review notes',3000);
 if(input.action==='edit') {
  const p=input.patch;if(!p)throw Error('Missing edits.');
  if(!['external-link','platform-embed','local-video'].includes(p.display))throw Error('Invalid display method.');
  if(p.display==='local-video'&&c.media?.mediaType!=='local')throw Error('Import a local video first.');
  if(p.display==='platform-embed'&&!c.embedMetadataAvailable)throw Error('No verified embed metadata for this source.');
  if(p.timestamp!==null&&(!Number.isFinite(p.timestamp)||p.timestamp<0))throw Error('Timestamp must be nonnegative seconds or blank.');
  c.title=required(p.title,'Title',500);c.scene=required(p.scene,'Scene',3000);c.technique=required(p.technique,'Technique',1000);
  c.prompt={short:required(p.prompt?.short,'Short prompt'),detailed:required(p.prompt?.detailed,'Detailed prompt'),controls:required(p.prompt?.controls,'Structured controls'),negative:required(p.prompt?.negative,'Negative constraints')};
  const controls:unknown=JSON.parse(c.prompt.controls);if(!controls||typeof controls!=='object'||Array.isArray(controls))throw Error('Structured controls must be a JSON object.');
  if(c.display!==p.display)delete c.permissions.display;
  c.display=p.display;c.timestamp=p.timestamp;c.status='candidate';
  c.inferences=[{value:c.technique,status:'inferred',evidence:c.evidence.map(e=>e.url),evidenceObservationIds:[],confidenceState:'insufficient evidence',source:'Human-edited hypothesis; no temporal analysis'}];
 } else if(input.action==='verify-rights'||input.action==='revoke-rights') {
  if(!input.scope||!scopes.includes(input.scope))throw Error('Choose a permission scope.');
  if(input.action==='revoke-rights')delete c.permissions[input.scope];
  else {const evidence=required(input.evidence,'Permission evidence',3000);const expiresAt=required(input.expiresAt,'Expiry',100);
   if(!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=Date.now())throw Error('Permission expiry must be in the future.');
   c.permissions[input.scope]={evidence,expiresAt,reviewer,verifiedAt:new Date().toISOString()};}
  c.status='candidate';
 } else if(input.action==='approve') {if(!displayAllowed(c))throw Error('Verify display permission with evidence and a future expiry before approval.');c.status='approved';}
 else if(input.action==='reject')c.status='rejected';else throw Error('Unknown action.');
 c.version++;c.audit.push({action:input.action+(input.scope?`:${input.scope}`:''),reviewer,notes,at:new Date().toISOString()});
 syncMediaPermissions(c);return c;
 });
}
export function syncMediaPermissions(c:FilmReference) {
 if(c.media){c.media.rightsEvidence=structuredClone(c.permissions);c.media.displayPermission=c.media.mediaType==='local'?c.display==='local-video'&&permissionActive(c,'store')&&permissionActive(c,'display'):c.display==='platform-embed'&&permissionActive(c,'embed');c.media.processingPermission=c.media.mediaType==='local'&&permissionActive(c,'store')&&permissionActive(c,'edit');}
}
export async function updateReferences<T>(root:string,operation:(records:FilmReference[])=>Promise<T>):Promise<T> {
 const prior=locks.get(root)??Promise.resolve();
 const job=prior.catch(()=>{}).then(async()=>{
  const records=await readReferences(root);const result=await operation(records);
  records.forEach(syncMediaPermissions);
  const directory=join(root,'local-film-references');await mkdir(directory,{recursive:true});const file=join(directory,'queue.json');await writeFile(file+'.tmp',JSON.stringify(records,null,2)+'\n',{mode:0o600});await rename(file+'.tmp',file);return result;
 });locks.set(root,job);try{return await job;}finally{if(locks.get(root)===job)locks.delete(root);}
}

import { mkdir, readFile, writeFile, rename, open, rm, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { Batch, Candidate } from './types';
import { validateAnalysis } from './schema';
export const hash=(bytes:Buffer|string)=>createHash('sha256').update(bytes).digest('hex');
export const storeRoot=(mode:'mock'|'live',root=process.cwd())=>resolve(root,'local-clip-ingestion',mode);
export async function atomicJSON(path:string,data:unknown){const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(data,null,2),{mode:0o600});await rename(temp,path);}
export async function locked<T>(directory:string,action:()=>Promise<T>) {
  await mkdir(directory,{recursive:true});let lock;
  try{lock=await open(resolve(directory,'.lock'),'wx',0o600);}catch{throw Error('Queue is busy or an interrupted run holds its lock. Review the run before clearing the lock.');}
  try{return await action();}finally{await lock.close();await rm(resolve(directory,'.lock'));}
}
export function candidateDigest(c:Candidate){return hash(JSON.stringify({metadata:c.metadata,analysis:c.analysis,asset:c.asset,samples:c.samples,analysisProvenance:c.analysisProvenance}));}
export function validateCandidate(c:Candidate) {
  if(!c||!/^((mock|pexels)-[1-9]\d*)$/.test(c.id)||!['candidate','ready','failed','duplicate','approved','rejected'].includes(c.status)||!Number.isSafeInteger(c.version)||c.version<1||!Array.isArray(c.audit)||!Array.isArray(c.samples)||c.samples.length>12||!c.metadata||c.id!==`${c.metadata.provider}-${c.metadata.providerId}`)throw Error('Invalid queue record.');
  for(const s of c.samples)if(!/^f\d+$/.test(s.id)||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>c.metadata.duration||!Number.isInteger(s.window)||s.file!==`${c.id}/frame-${s.id.slice(1)}.jpg`)throw Error('Invalid sample record.');
  if(c.asset){if(!['video.mp4','video.webm'].some(name=>c.asset!.file===`${c.id}/${name}`)||c.asset.poster!==`${c.id}/poster.jpg`||![c.asset.sha256,c.asset.posterSha256].every(h=>/^[a-f0-9]{64}$/.test(h)))throw Error('Invalid cached asset record.');}
  if(c.analysis)validateAnalysis(c.analysis,c.samples);
  if(c.status==='approved'&&(!c.review||!c.review.reviewer?.trim()||!c.review.notes?.trim()||!c.review.rightsVerified||c.review.digest!==candidateDigest(c)))throw Error('Approval is absent or stale.');
  return c;
}
export async function readBatch(directory:string):Promise<Batch|null> {
  let raw:string;try{raw=await readFile(resolve(directory,'batch.json'),'utf8');}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return null;throw e;}
  const b=JSON.parse(raw) as Batch;
  if(b.version!==1||b.id!=='pilot-001'||!['mock','live'].includes(b.mode)||!['running','awaiting-review','stopped'].includes(b.status)||!Array.isArray(b.candidates)||b.candidates.length>12||new Set(b.candidates.map(c=>c.id)).size!==b.candidates.length||!Number.isInteger(b.requests)||b.requests<0||b.requests>8||!Number.isInteger(b.analysisCalls)||b.analysisCalls<0||b.analysisCalls>12)throw Error('Invalid batch state.');
  b.candidates.forEach(validateCandidate);return b;
}
export async function readPrivateAsset(directory:string,file:string) {
  if(!/^(?:pexels|mock)-[1-9]\d*\/(?:video\.(?:mp4|webm)|poster\.jpg|frame-\d+\.jpg)$/.test(file))throw Error('Invalid asset path.');
  const root=await realpath(directory), path=await realpath(resolve(directory,file));
  if(!path.startsWith(root+sep))throw Error('Asset path escapes store.');
  return readFile(path);
}
export async function verifiedAssets(directory:string,c:Candidate) {
  if(!c.asset)throw Error('Cached asset missing.');
  const [video,poster]=await Promise.all([readPrivateAsset(directory,c.asset.file),readPrivateAsset(directory,c.asset.poster)]);
  if(hash(video)!==c.asset.sha256||hash(poster)!==c.asset.posterSha256)throw Error('Asset changed after analysis.');return {video,poster};
}

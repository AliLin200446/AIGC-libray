import { cp, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { candidate } from './pipeline';
import { atomicJSON, hash, locked, readBatch } from './store';
import { validateAnalysis } from './schema';
import { queries } from './provider';
import { fields, type Analysis, type Batch, type ProviderAdapter } from './types';
export function mockAnalysis(index:number):Analysis {
  const findings = {} as Analysis['findings'];
  for (const field of fields) findings[field] = {value:null,confidence:'insufficient evidence',observationIds:[],frameIds:[]};
  findings.cameraMovement={value:'Tracking',confidence:'weak evidence',observationIds:['o1'],frameIds:['f0','f3']};
  findings.framing={value:'Medium Shot',confidence:'moderate evidence',observationIds:['o2'],frameIds:['f0']};
  return {title:`Synthetic motion study ${String(index).padStart(2,'0')}`,description:'Original geometric animation for testing the review workflow. Analysis is a mock fixture, not model output.',
    observations:[{id:'o1',statement:'The vertical bars shift left between these frames while the central shape remains near the middle.',frameIds:['f0','f3'],confidence:'moderate evidence'},{id:'o2',statement:'A central geometric figure occupies the middle region of the frame.',frameIds:['f0'],confidence:'strong evidence'}],findings,
    evidence:[{startFrame:'f0',endFrame:'f3',cue:'subject-relative movement',description:'Comparative change in positions of bars and central figure within the first sampled window.',observationIds:['o1']}],
    prompt:{camera:'Create a gentle lateral tracking shot, keeping the subject near the center.',framing:'Use a medium composition with vertical structures in the background.',subject:'Let the subject move subtly within the frame.',lighting:'Use soft, diffuse illumination.',continuity:'Maintain a continuous shot with stable framing and no abrupt cuts.'},limitations:['MOCK ANALYSIS: authored solely for workflow testing, not a vision-model result.','Two-dimensional animation does not establish physical camera translation. The tracking label is an unverified creative interpretation.','Sparse windows cannot establish continuous motion throughout the recording.']};
}
/** The same adapter contract as Pexels, with entirely local synthetic metadata. */
export function mockAdapter(): ProviderAdapter {
  return { async discover(query) {
    const slot = queries.indexOf(query);
    if (slot < 0) return [];
    return [slot + 1, ...(slot < 4 ? [slot + 9] : [])].map(i => ({provider:'mock' as const,providerId:String(i),sourceUrl:'',creator:'FRAMEFIELD',creatorUrl:'',title:`Synthetic workflow test ${i}`,thumbnailUrl:'',videoUrl:'',duration:2.4,width:640,height:360,licenseName:'CC0 — original synthetic test artwork',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/',query,retrievedAt:new Date().toISOString()}));
  }};
}
export async function seedMock(directory:string,root=process.cwd()) {
  return locked(directory,async()=>{
    const existing=await readBatch(directory);if(existing)return existing;
    const batch:Batch={version:1,id:'pilot-001',mode:'mock',status:'awaiting-review',startedAt:new Date().toISOString(),candidates:[],requests:0,analysisCalls:0,errors:[],permission:null};
    const provider=mockAdapter();
    const discovered=(await Promise.all(queries.map(query=>provider.discover(query)))).flat();
    for(let i=1;i<=12;i++){
      const id=`mock-${i}`, fixture=resolve(root,'scripts/fixtures/clips',id);await mkdir(resolve(directory,id),{recursive:true});await cp(fixture,resolve(directory,id),{recursive:true});
      const c=candidate(discovered.find(item=>item.providerId===String(i))!);
      const times=[0.048,0.208,0.368,0.528,0.96,1.12,1.28,1.44,1.8,1.96,2.12,2.28];
      c.samples=times.map((seconds,j)=>({id:`f${j}`,seconds,window:Math.floor(j/4),file:`${id}/frame-${j}.jpg`}));
      c.asset={file:`${id}/video.webm`,sha256:hash(await readFile(resolve(directory,id,'video.webm'))),poster:`${id}/poster.jpg`,posterSha256:hash(await readFile(resolve(directory,id,'poster.jpg')))};
      c.analysis=validateAnalysis(mockAnalysis(i),c.samples);c.status='ready';c.analysisProvenance={kind:'mock',model:'authored fixture — no API call',requestedAt:new Date().toISOString(),responseId:'mock',usage:null};batch.candidates.push(c);
    }
    await atomicJSON(resolve(directory,'batch.json'),batch);return batch;
  });
}

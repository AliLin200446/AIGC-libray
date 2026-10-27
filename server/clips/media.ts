import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, copyFile, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { boundedResponse, providerUrl } from './provider';
import { hash } from './store';
import type { Candidate, Sample } from './types';
const exec=promisify(execFile);
export async function checkMediaTools(){for(const tool of ['ffmpeg','ffprobe'])await exec(tool,['-version'],{timeout:10000,maxBuffer:1024*1024});}
export function samplePlan(duration:number,id:string):Sample[] {
  const span=Math.min(1.2,duration/5);
  return [0.02*duration,0.5*duration-span/2,0.95*duration-span].flatMap((start,window)=>Array.from({length:4},(_,i)=>({id:`f${window*4+i}`,seconds:Math.round((start+span*i/3)*1000)/1000,window,file:`${id}/frame-${window*4+i}.jpg`} )));
}
export async function cacheAndSample(c:Candidate,directory:string,fetcher:typeof fetch=fetch) {
  const dest=resolve(directory,c.id);await mkdir(dest,{recursive:true});
  const response=await fetcher(providerUrl(c.metadata.videoUrl,'media'),{redirect:'error',signal:AbortSignal.timeout(60000)});
  const bytes=await boundedResponse(response,40*1024*1024);
  if(!bytes.subarray(4,32).includes(Buffer.from('ftyp')))throw Error('Expected an MP4 container.');
  const file=`${c.id}/video.mp4`;await writeFile(resolve(directory,file),bytes,{mode:0o600});
  try {
    const {stdout}=await exec('ffprobe',['-v','error','-protocol_whitelist','file,pipe','-show_entries','format=duration:stream=codec_type,width,height','-of','json',resolve(directory,file)],{timeout:15000,maxBuffer:1024*1024});
    const meta=JSON.parse(stdout);const duration=Number(meta.format?.duration);const video=meta.streams?.find((s:{codec_type:string})=>s.codec_type==='video');
    if(!Number.isFinite(duration)||duration<2||duration>60||!video||video.width>1920||video.height>1080)throw Error('Unsupported duration or dimensions.');
    c.metadata.duration=duration;
    const samples=samplePlan(duration,c.id);
    for(const s of samples)await exec('ffmpeg',['-nostdin','-v','error','-protocol_whitelist','file,pipe','-ss',String(s.seconds),'-i',resolve(directory,file),'-frames:v','1','-vf','scale=640:-2','-q:v','3','-y',resolve(directory,s.file)],{timeout:15000,maxBuffer:1024*1024});
    const poster=`${c.id}/poster.jpg`;await copyFile(resolve(directory,samples[0]!.file),resolve(directory,poster));
    c.samples=samples;c.asset={file,sha256:hash(bytes),poster,posterSha256:hash(await readFile(resolve(directory,poster)))};
  }catch(e){await rm(dest,{recursive:true,force:true});throw e;}
}

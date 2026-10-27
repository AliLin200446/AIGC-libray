import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, rm, rename, stat, open } from 'node:fs/promises';
import { join, resolve, basename } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import type { IncomingMessage } from 'node:http';
import type { FilmReference, ImportedMedia, ImportInput } from './types';
import { updateReferences, required, permissionActive } from './store';
const require=createRequire(import.meta.url);
const exec=promisify(execFile);
export const maxUploadBytes=128*1024*1024;
export function toolPath(tool:'ffmpeg'|'ffprobe'):string {return tool==='ffmpeg'?require('ffmpeg-static'):require('ffprobe-static').path;}
export function parseVideoUrl(value:string) {
 const u=new URL(required(value,'Video URL',2000));if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Use an HTTPS YouTube or Vimeo video URL.');
 let id:string|undefined;let provider:'youtube'|'vimeo';
 if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com','youtu.be'].includes(u.hostname)) {
  provider='youtube';id=u.hostname==='youtu.be'?u.pathname.slice(1):u.pathname==='/watch'?u.searchParams.get('v')??undefined:/^\/(?:embed|shorts)\/([\w-]+)\/?$/.exec(u.pathname)?.[1];
  if(!id||!/^[\w-]{11}$/.test(id))throw Error('Unsupported YouTube video URL.');
 }else if(['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(u.hostname)) {provider='vimeo';id=/^\/(?:video\/)?(\d+)\/?$/.exec(u.pathname)?.[1];if(!id)throw Error('Use a public Vimeo video URL.');}
 else throw Error('Unsupported provider. Only YouTube and public Vimeo URLs are supported.');
 return {provider,id,sourceUrl:provider==='youtube'?`https://www.youtube.com/watch?v=${id}`:`https://vimeo.com/${id}`,embedUrl:provider==='youtube'?`https://www.youtube.com/embed/${id}`:`https://player.vimeo.com/video/${id}`};
}
export async function videoMetadata(value:string,fetcher:typeof fetch=fetch) {
 const source=parseVideoUrl(value);const endpoint=new URL(source.provider==='youtube'?'https://www.youtube.com/oembed':'https://vimeo.com/api/oembed.json');endpoint.searchParams.set('url',source.sourceUrl);endpoint.searchParams.set('format','json');
 const r=await fetcher(endpoint,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error(`Provider metadata unavailable (${r.status}). No import saved.`);
 const reader=r.body?.getReader();if(!reader)throw Error('Empty metadata response.');let size=0;const chunks:Uint8Array[]=[];try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>65536)throw Error('Metadata response too large.');chunks.push(value);}}finally{await reader.cancel();}
 const data=JSON.parse(Buffer.concat(chunks).toString());if(data.type!=='video')throw Error('Provider did not return video metadata.');
 return {...source,thumbnailUrl:typeof data.thumbnail_url==='string'&&data.thumbnail_url.startsWith('https://')?data.thumbnail_url:null,title:required(data.title,'Provider title',1000),attribution:required(data.author_name,'Provider attribution',1000),duration:Number.isFinite(data.duration)&&data.duration>0?Number(data.duration):null};
}
function candidate(records:FilmReference[],input:ImportInput){const c=records.find(c=>c.id===input.id);if(!c)throw Error('Unknown reference ID. Import never creates records.');if(c.version!==input.version)throw Error('This record changed. Refresh before importing.');required(input.reviewer,'Reviewer',120);required(input.notes,'Import notes',3000);return c;}
function audit(c:FilmReference,input:ImportInput,action:string){c.version++;c.status='candidate';c.audit.push({action,reviewer:input.reviewer,notes:input.notes,at:new Date().toISOString()});}
function baseMedia():ImportedMedia{return {mediaType:'local',sourceUrl:'',embedUrl:null,localAssetPath:null,optimizedPath:null,posterPath:null,startTime:0,endTime:null,duration:null,attribution:'',rightsEvidence:{},displayPermission:false,processingPermission:false,importStatus:'metadata-only',sha256:null,mimeType:null,originalName:null};}
export async function importUrls(root:string,inputs:ImportInput[],fetcher:typeof fetch=fetch){
 if(!Array.isArray(inputs)||!inputs.length||inputs.length>12)throw Error('A manifest must contain 1–12 records.');
 return updateReferences(root,async records=>{
  const seen=new Set<string>();const ids=new Set<string>();
  for(const i of inputs){candidate(records,i);const url=parseVideoUrl(i.sourceUrl??'').sourceUrl;if(seen.has(url)||ids.has(i.id))throw Error('Duplicate URL or reference ID in manifest.');seen.add(url);ids.add(i.id);
   if(records.some(c=>c.media?.sourceUrl===url))throw Error('This video is already imported.');
   if(records.some(c=>c.id!==i.id&&c.sourceUrl===url))throw Error('Source is already associated with another reference.');}
  // Atomic batch: no record changes unless every metadata request succeeds.
  const results=[];for(const i of inputs){const metadata=await videoMetadata(i.sourceUrl!,fetcher);results.push({i,metadata});}
  for(const {i,metadata:m} of results){const c=candidate(records,i);c.media={...baseMedia(),mediaType:m.provider,sourceUrl:m.sourceUrl,embedUrl:m.embedUrl,attribution:m.attribution,duration:m.duration};c.sourceUrl=m.sourceUrl;c.title=m.title;c.publisher=m.attribution;c.thumbnailUrl=m.thumbnailUrl;c.embedUrl=m.embedUrl;c.embedMetadataAvailable=true;c.display='platform-embed';c.permissions={};audit(c,i,'import-url');}
  return results.map(({i})=>records.find(c=>c.id===i.id)!);
 });
}
export async function receiveUpload(req:IncomingMessage,root:string):Promise<string>{
 const directory=join(root,'local-film-references/staging');await mkdir(directory,{recursive:true});const file=join(directory,randomUUID());const handle=await open(file,'wx',0o600);let total=0;
 try{for await(const chunk of req){const data=Buffer.from(chunk);total+=data.length;if(total>maxUploadBytes)throw Error('Maximum upload size is 128 MiB.');await handle.writeFile(data);}if(!total)throw Error('Empty upload.');return file;}catch(e){await rm(file,{force:true});throw e;}finally{await handle.close();}
}
export async function inspectVideo(file:string,mime:string,name:string){
 const info=await stat(file);if(!info.size||info.size>maxUploadBytes)throw Error('Maximum upload size is 128 MiB.');
 const extension=name.toLowerCase().endsWith('.mp4')?'mp4':name.toLowerCase().endsWith('.webm')?'webm':null;
 if(!extension||mime!==`video/${extension}`)throw Error('Upload an MP4 or WebM with a matching MIME type.');
 const handle=await open(file,'r');const magic=Buffer.alloc(64);try{await handle.read(magic,0,64,0);}finally{await handle.close();}
 if(extension==='mp4'?!magic.subarray(4,32).includes(Buffer.from('ftyp')):!magic.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3])))throw Error('File signature does not match its video type.');
 const {stdout}=await exec(toolPath('ffprobe'),['-v','error','-protocol_whitelist','file,pipe','-show_entries','format=duration,format_name:stream=codec_type,codec_name,width,height','-of','json',file],{timeout:20000,maxBuffer:1024*1024});
 const m=JSON.parse(stdout);const duration=Number(m.format?.duration);const video=m.streams?.find((s:{codec_type:string})=>s.codec_type==='video');
 if(!video||!Number.isFinite(duration)||duration<=0||duration>3600||video.width<2||video.height<2||video.width>7680||video.height>4320)throw Error('Unsupported video: maximum one hour and 7680 × 4320.');
 if(extension==='mp4'?!String(m.format?.format_name).includes('mp4'):!String(m.format?.format_name).includes('webm'))throw Error('Invalid media container.');
 if(!(extension==='mp4'?['h264','hevc','av1']:['vp8','vp9','av1']).includes(video.codec_name))throw Error('Unsupported video codec.');
 return {duration,extension,sha256:createHash('sha256').update(await readFile(file)).digest('hex')};
}
export async function importUpload(root:string,input:ImportInput,file:string,mime:string,name:string){
 try{return await updateReferences(root,async records=>{
  const c=candidate(records,input);const evidence=required(input.storageEvidence,'Storage rights evidence',3000);const expires=required(input.expiresAt,'Storage permission expiry',100);if(!(Date.parse(expires)>Date.now()))throw Error('Storage permission expiry must be in the future.');
  const attribution=required(input.attribution,'Attribution',1000);const m=await inspectVideo(file,mime,name);
  if(records.some(c=>c.media?.sha256===m.sha256))throw Error('Duplicate file: this video is already imported.');
  const directory=join(root,'local-film-references/media',c.id);await mkdir(directory,{recursive:true});const relative=`${c.id}/${randomUUID()}.${m.extension}`;await rename(file,join(root,'local-film-references/media',relative));
  c.permissions={store:{evidence,expiresAt:expires,reviewer:input.reviewer,verifiedAt:new Date().toISOString()}};
  c.media={...baseMedia(),mediaType:'local',sourceUrl:c.sourceUrl,localAssetPath:relative,attribution,duration:m.duration,endTime:Math.min(12,m.duration),importStatus:'uploaded',sha256:m.sha256,mimeType:mime,originalName:basename(name)};
  c.display='local-video';c.thumbnailUrl=null;c.embedUrl=null;c.embedMetadataAvailable=false;audit(c,input,'upload-local');return c;
 });}finally{await rm(file,{force:true});}
}
export function assetFile(root:string,path:string){const base=resolve(root,'local-film-references/media');const file=resolve(base,path);if(!file.startsWith(base+'/'))throw Error('Invalid asset path.');return file;}
export function validateRange(start:unknown,end:unknown,duration:number,max=12){if(typeof start!=='number'||typeof end!=='number'||!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start||end>duration||end-start>max+0.00001)throw Error(`Select a valid range of up to ${max} seconds within the video.`);return {start,end};}
export async function selectClip(root:string,input:ImportInput,process=false){return updateReferences(root,async records=>{
 const c=candidate(records,input);const m=c.media;if(!m)throw Error('Import media first.');
 if(m.mediaType!=='local') {if(!Number.isFinite(input.startTime)||input.startTime!<0||input.startTime!>(m.duration??86400))throw Error('Invalid start timestamp.');m.startTime=input.startTime!;m.endTime=null;audit(c,input,'embed-start');return c;}
 if(!permissionActive(c,'store')||!permissionActive(c,'edit'))throw Error('Storage and editing permissions are required for clip selection and processing.');
 const {start,end}=validateRange(input.startTime,input.endTime,m.duration!);
 let output:string|null=null,poster:string|null=null;
 if(process){const prefix=`${c.id}/${randomUUID()}`;output=prefix+'.mp4';poster=prefix+'.jpg';
  try {await exec(toolPath('ffmpeg'),['-nostdin','-v','error','-protocol_whitelist','file,pipe','-ss',String(start),'-i',assetFile(root,m.localAssetPath!),'-t',String(end-start),'-map','0:v:0','-map','0:a?','-c:a','aac','-b:a','128k','-vf',"scale=w='trunc(min(1280,iw)/2)*2':h=-2",'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-threads','2','-n',assetFile(root,output)],{timeout:120000,maxBuffer:1024*1024});
   await exec(toolPath('ffmpeg'),['-nostdin','-v','error','-protocol_whitelist','file,pipe','-i',assetFile(root,output),'-frames:v','1','-q:v','3','-n',assetFile(root,poster)],{timeout:20000,maxBuffer:1024*1024});
   if(!permissionActive(c,'store')||!permissionActive(c,'edit'))throw Error('Permission expired during processing.');
  }catch(e){await rm(assetFile(root,output),{force:true});await rm(assetFile(root,poster),{force:true});throw e;}
 }
 m.startTime=start;m.endTime=end;m.optimizedPath=output;m.posterPath=poster;m.importStatus=process?'ready':'uploaded';audit(c,input,process?'prepare-clip':'select-range');return c;
});}
export function canServe(c:FilmReference,kind:string){return c.media?.mediaType==='local'&&c.display==='local-video'&&permissionActive(c,'store')&&permissionActive(c,'display')&&(kind==='original'||permissionActive(c,'edit'));}

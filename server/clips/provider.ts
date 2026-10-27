import type { ProviderAdapter, VideoMetadata } from './types';
const queries=['dolly camera movement','tracking shot','cinematic pan','camera tilt','orbit camera','handheld cinematic','static cinematic shot','crane camera'];
export { queries };
export function providerUrl(value:string,kind:'page'|'media') {
  const url=new URL(value);
  const hosts=kind==='page'?['www.pexels.com','pexels.com']:['videos.pexels.com','images.pexels.com'];
  if(url.protocol!=='https:'||!hosts.includes(url.hostname)||url.port||url.username||url.password)throw Error('Unapproved provider URL.');
  return url.href;
}
export function parseVideo(raw:unknown,query:string):VideoMetadata {
  const v=raw as {id:number;url:string;image:string;duration:number;width:number;height:number;user:{name:string;url:string};video_files:{link:string;file_type:string;width:number;height:number}[]};
  if(!v||!Number.isSafeInteger(v.id)||v.id<=0||typeof v.user?.name!=='string'||!v.user.name.trim()||v.user.name.length>200||!Number.isFinite(v.duration)||v.duration<2||v.duration>60||!Number.isFinite(v.width)||!Number.isFinite(v.height)||v.width<v.height||v.height<1||!Array.isArray(v.video_files))throw Error('Unsupported provider metadata.');
  const files=v.video_files.filter(f=>f.file_type==='video/mp4'&&Number.isFinite(f.width)&&Number.isFinite(f.height)&&f.width>=480&&f.width<=1280&&f.height>=270&&f.height<=720).sort((a,b)=>b.width-a.width);
  const file=files[0];if(!file)throw Error('No bounded MP4 rendition available.');
  return {provider:'pexels',providerId:String(v.id),sourceUrl:providerUrl(v.url,'page'),creator:v.user.name,creatorUrl:providerUrl(v.user.url,'page'),title:`Pexels video ${v.id}`,thumbnailUrl:providerUrl(v.image,'media'),videoUrl:providerUrl(file.link,'media'),duration:v.duration,width:file.width,height:file.height,licenseName:'Pexels License',licenseUrl:'https://www.pexels.com/license/',query,retrievedAt:new Date().toISOString()};
}
export async function boundedResponse(response:Response,max:number) {
  if(!response.ok||!response.body)throw Error(`Provider HTTP ${response.status}. No automatic retry.`);
  if(Number(response.headers.get('content-length'))>max){await response.body.cancel();throw Error('Provider response exceeds byte limit.');}
  const reader=response.body.getReader();let total=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>max)throw Error('Provider response exceeds byte limit.');chunks.push(value);}return Buffer.concat(chunks);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function pexelsAdapter(key:string,fetcher:typeof fetch=fetch):ProviderAdapter {
  return {async discover(query){
    if(!key.trim())throw Error('PEXELS_API_KEY is not configured.');
    const url=new URL('https://api.pexels.com/v1/videos/search');url.search=new URLSearchParams({query,orientation:'landscape',per_page:'6',page:'1'}).toString();
    const response=await fetcher(url,{headers:{Authorization:key},redirect:'error',signal:AbortSignal.timeout(20000)});
    const raw=JSON.parse((await boundedResponse(response,2*1024*1024)).toString()) as {videos:unknown[]};
    if(!Array.isArray(raw.videos))throw Error('Malformed provider search response.');
    const found:VideoMetadata[]=[];
    for(const video of raw.videos.slice(0,6)){try{found.push(parseVideo(video,query));}catch{/* Unsupported metadata or rendition is not eligible. */}}
    return found;
  }};
}

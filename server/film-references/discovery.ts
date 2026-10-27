import type { FilmReference } from './types';
export interface DiscoveryResult { referenceId:string; sourceUrl:string; title:string; publisher:string; channelId:string|null; thumbnailUrl:string|null; embeddable:boolean|null; license:string|null; regionRestriction:unknown; permissionStatus:'unverified' }
export interface FilmDiscoveryProvider { discover(reference:FilmReference):Promise<DiscoveryResult[]> }
/** Offline adapter: the reviewed research sources, no network or media requests. */
export class ResearchProvider implements FilmDiscoveryProvider {
 async discover(c:FilmReference):Promise<DiscoveryResult[]> {return [{referenceId:c.id,sourceUrl:c.sourceUrl,title:c.title,publisher:c.publisher,channelId:null,thumbnailUrl:c.thumbnailUrl,embeddable:null,license:null,regionRestriction:null,permissionStatus:'unverified'}];}
}
interface Video { id:string;snippet:{title:string;channelId:string;channelTitle:string;thumbnails?:{medium?:{url:string}}};status:{embeddable?:boolean;privacyStatus?:string;license?:string};contentDetails?:{regionRestriction?:unknown} }
/** Metadata only. Fixed API origin, explicit channel allowlist, no audiovisual endpoint. */
export class YouTubeDiscoveryProvider implements FilmDiscoveryProvider {
 private requests=0;
 constructor(private key:string,private channels:ReadonlySet<string>,private request:typeof fetch=fetch){if(!key||!channels.size)throw Error('Server-side YOUTUBE_API_KEY and verified YOUTUBE_CHANNEL_IDS are required.');}
 private async api(path:'search'|'videos',params:Record<string,string>):Promise<unknown>{
  if(++this.requests>24)throw Error('Pilot request budget reached.');
  const url=new URL(`https://www.googleapis.com/youtube/v3/${path}`);for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
  // Credential in a header, never in loggable request URLs or persisted reports.
  let response:Response;try{response=await this.request(url,{headers:{'X-Goog-Api-Key':this.key},signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw Error('YouTube metadata request failed.');}
  if(!response.ok)throw Error(`YouTube metadata request returned HTTP ${response.status}.`);
  return response.json();
 }
 async discover(c:FilmReference):Promise<DiscoveryResult[]> {
  const search=await this.api('search',{part:'snippet',type:'video',q:`${c.film} ${c.year} ${c.scene} official clip`,maxResults:'5'}) as {items?:{id?:{videoId?:string}}[]};
  const ids=(search.items??[]).map(i=>i.id?.videoId).filter((id):id is string=>typeof id==='string'&&/^[\w-]{11}$/.test(id)).slice(0,5);if(!ids.length)return [];
  const videos=await this.api('videos',{part:'snippet,status,contentDetails',id:ids.join(',')}) as {items?:Video[]};
  return (videos.items??[]).filter(v=>/^[\w-]{11}$/.test(v.id)&&this.channels.has(v.snippet?.channelId)&&v.status?.privacyStatus==='public').map(v=>({referenceId:c.id,sourceUrl:`https://www.youtube.com/watch?v=${v.id}`,title:v.snippet.title,publisher:v.snippet.channelTitle,channelId:v.snippet.channelId,thumbnailUrl:v.snippet.thumbnails?.medium?.url??null,embeddable:v.status.embeddable===true,license:v.status.license??null,regionRestriction:v.contentDetails?.regionRestriction??null,permissionStatus:'unverified'}));
 }
}
export async function discoverBatch(references:FilmReference[],provider:FilmDiscoveryProvider,delayMs=1100) {
 if(references.length>12)throw Error('Pilot limited to twelve films.');
 const results:DiscoveryResult[]=[];const seen=new Set<string>();const errors:{referenceId:string;message:string}[]=[];
 for(const c of references){try{for(const r of await provider.discover(c)){if(!seen.has(r.sourceUrl)){seen.add(r.sourceUrl);results.push(r);break;}}}catch(e){errors.push({referenceId:c.id,message:e instanceof Error?e.message:'Discovery failed'});break;}
  if(delayMs)await new Promise(resolve=>setTimeout(resolve,delayMs));
 }
 return {status:'awaiting-review',results,errors,processingEnabled:false,publishingEnabled:false};
}

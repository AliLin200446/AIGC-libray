import { loadEnv } from 'vite';
import { ResearchProvider, YouTubeDiscoveryProvider, type DiscoveryResult } from './discovery';
import { readReferences, updateReferences, required } from './store';
import { parseVideoUrl, importUrls } from './import';
import type { FilmReference, ImportInput, Grant } from './types';
export interface CoverCandidate {
 id:string; provider:'tmdb'; filmId:number; title:string; year:number; url:string; sourceUrl:string;
 orientation:'landscape'|'portrait'; attribution:string; restrictions:string; rightsStatus:'unverified';
 match:'exact-title-year'|'title-year-review';
}
export interface VideoCandidate extends DiscoveryResult {
 id:string; embedUrl:string|null; duration:number|null; discoveredAt:string;
 sceneMatch:'unverified'; sceneEvidence:string; playbackVerified:false;
}
export interface MediaDiscovery {
 at:string; covers:CoverCandidate[]; videos:VideoCandidate[]; coverMessage:string; videoMessage:string;
}
export interface CoverSelection { candidate:CoverCandidate; grant?:Grant }
export interface MediaReview { sceneMatch?:'verified'|'unverified'; techniqueMatch?:'verified'|'unverified'; sourceUrl:string; sceneEvidence:string; reviewer:string; reviewedAt:string; playbackVerified:boolean }
export const tmdbNotice='This product uses the TMDB API but is not endorsed or certified by TMDB.';
export function mediaConfig(root=process.cwd()) { return {...loadEnv('development',root,''),...process.env}; }
export function mediaAvailability(root:string) {const e=mediaConfig(root);return {tmdb:!!e.TMDB_API_READ_ACCESS_TOKEN,youtube:!!e.YOUTUBE_API_KEY&&!!e.YOUTUBE_CHANNEL_IDS,tmdbLogo:validImage(e.TMDB_ATTRIBUTION_LOGO_URL??'')?e.TMDB_ATTRIBUTION_LOGO_URL:null};}
export function validImage(value:string) {try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='image.tmdb.org'&&!u.port&&!u.username&&!u.password&&/^\/t\/p\/(?:w\d+|original)\/[\w.-]+\.(?:jpg|png|webp|svg)$/.test(u.pathname)&&!u.search&&!u.hash;}catch{return false;}}
export function coverAllowed(c:FilmReference,now=Date.now()) {const g=c.cover?.grant;return !!g&&!!g.evidence.trim()&&!!g.reviewer.trim()&&Date.parse(g.expiresAt)>now&&!!c.cover&&validImage(c.cover.candidate.url);}
const normalize=(s:string)=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
interface Movie {id:number;title:string;original_title?:string;release_date:string;backdrop_path?:string;poster_path?:string}
export function matchFilm(movie:Movie,c:Pick<FilmReference,'film'|'year'>) {return Number(movie.release_date?.slice(0,4))===c.year&&[movie.title,movie.original_title??''].some(t=>normalize(t)===normalize(c.film));}
export class TMDBCoverProvider {
 constructor(private token:string,private request:typeof fetch=fetch){}
 private async api(path:string,params:Record<string,string>={}) {const u=new URL('https://api.themoviedb.org/3/'+path);for(const [k,v]of Object.entries(params))u.searchParams.set(k,v);let r:Response;try{r=await this.request(u,{headers:{Authorization:`Bearer ${this.token}`},redirect:'error',signal:AbortSignal.timeout(15000)});}catch{throw Error('TMDB metadata request failed.');}if(!r.ok)throw Error(`TMDB metadata returned HTTP ${r.status}.`);return r.json();}
 async discover(c:FilmReference):Promise<CoverCandidate[]> {
  const search=await this.api('search/movie',{query:c.film,year:String(c.year),include_adult:'false'});
  const matches=(search.results??[]).filter((m:Movie)=>matchFilm(m,c)).slice(0,3) as Movie[];
  if(!matches.length)return [];
  const config=await this.api('configuration');const base=config.images?.secure_base_url;
  if(base!=='https://image.tmdb.org/t/p/')throw Error('Unsupported TMDB image origin.');
  const out:CoverCandidate[]=[];
  for(const movie of matches){if(!Number.isSafeInteger(movie.id)||movie.id<=0)continue;
   for(const [orientation,path,sizes,preferred] of [['landscape',movie.backdrop_path,config.images.backdrop_sizes,'w780'],['portrait',movie.poster_path,config.images.poster_sizes,'w500']] as const){
    if(typeof path!=='string'||!/^\/[\w.-]+\.(jpg|png|webp)$/.test(path)||!Array.isArray(sizes))continue;
    const size=sizes.includes(preferred)?preferred:sizes.find((v:unknown)=>typeof v==='string'&&/^w\d+$/.test(v));if(!size)continue;
    const url=base+size+path;if(!validImage(url))continue;
    out.push({id:`tmdb-${movie.id}-${orientation}`,provider:'tmdb',filmId:movie.id,title:movie.title,year:c.year,url,sourceUrl:`https://www.themoviedb.org/movie/${movie.id}`,orientation,attribution:'Image and movie metadata supplied by TMDB. '+tmdbNotice,restrictions:'Underlying image rights are not owned by TMDB. Verify applicable non-commercial/commercial terms, attribution/logo, and image display rights. No caching, downloads, or redistribution authorized by discovery. https://developer.themoviedb.org/docs/faq',rightsStatus:'unverified',match:matches.length===1?'exact-title-year':'title-year-review'});
   }
  }return out;
 }
}
function asVideo(r:DiscoveryResult,c:FilmReference):VideoCandidate|null {
 let parsed:ReturnType<typeof parseVideoUrl>;try{parsed=parseVideoUrl(r.sourceUrl);}catch{return null;}
 const known=c.media?.sourceUrl===parsed.sourceUrl&&c.embedMetadataAvailable;
 return {...r,id:parsed.provider+'-'+parsed.id,embedUrl:r.embeddable===true||(r.embeddable===null&&known)?parsed.embedUrl:null,duration:r.duration??(known?c.media?.duration??null:null),discoveredAt:new Date().toISOString(),sceneMatch:'unverified',sceneEvidence:'Title/channel metadata only. Watch the intended passage and record time-specific evidence before attaching.',playbackVerified:false};
}
let running=false;
export async function discoverMedia(root:string,kind:'cover'|'video'|'all',id?:string,request:typeof fetch=fetch) {
 if(running)throw Error('A discovery batch is already running.');running=true;
 try{const records=await readReferences(root);const selected=id?records.filter(c=>c.id===id):records;if(!selected.length||selected.length>12)throw Error('Choose an existing reference; batch limit is twelve.');
 const env=mediaConfig(root);const youtube=env.YOUTUBE_API_KEY&&env.YOUTUBE_CHANNEL_IDS?new YouTubeDiscoveryProvider(env.YOUTUBE_API_KEY,new Set(env.YOUTUBE_CHANNEL_IDS.split(',').map(v=>v.trim()).filter(Boolean)),request):null;
 const tmdb=env.TMDB_API_READ_ACCESS_TOKEN?new TMDBCoverProvider(env.TMDB_API_READ_ACCESS_TOKEN,request):null;
 const updated=[];
 for(const c of selected){const d:MediaDiscovery=c.discovery?structuredClone(c.discovery):{at:'',covers:[],videos:[],coverMessage:'Not searched.',videoMessage:'Not searched.'};d.at=new Date().toISOString();
  if(kind!=='video'){try{d.covers=tmdb?await tmdb.discover(c):[];d.coverMessage=tmdb?(d.covers.length?'Title/year matches; image rights unverified.':'No exact title/year image match. Keep placeholder.'):'Blocked: TMDB_API_READ_ACCESS_TOKEN is missing. No cover lookup performed.';}catch(e){d.coverMessage=e instanceof Error?e.message:'Cover discovery failed.';}}
  if(kind!=='cover'){try{const prior=c.mediaReview;const reusable=prior?.sourceUrl===c.media?.sourceUrl&&prior?.playbackVerified&&prior.sceneMatch==='verified'&&prior.techniqueMatch==='verified'&&parseVideoUrl(prior.sourceUrl).embedUrl===c.media?.embedUrl?d.videos.find(v=>v.sourceUrl===prior.sourceUrl):undefined;
   if(reusable){d.videos=[{...reusable,embedUrl:c.media!.embedUrl}];d.videoMessage=`Existing scene/technique-reviewed source retained (${prior!.reviewedAt}); no new search. Current availability and display rights remain separate checks.`;}
   else {const found=youtube?await youtube.discover(c):await new ResearchProvider().discover(c);d.videos=found.map(r=>asVideo(r,c)).filter((v):v is VideoCandidate=>!!v);d.videoMessage=youtube?'Official channel allowlist checked; scene and playback still require human review.':'YouTube API key/channel allowlist missing. Existing source metadata reused; no search or playback verification performed.';}}catch(e){d.videoMessage=e instanceof Error?e.message:'Video discovery failed.';}}
  await updateReferences(root,async current=>{const target=current.find(x=>x.id===c.id);if(!target||target.version!==c.version)throw Error('Reference changed during discovery. Refresh and retry.');target.discovery=d;target.version++;target.audit.push({action:'discover-media:'+kind,reviewer:'Explicit Admin discovery',at:d.at,notes:d.coverMessage+' '+d.videoMessage});});updated.push(c.id);
 }return {updated,publishingEnabled:false,processingEnabled:false};
 }finally{running=false;}
}
export interface MediaAction extends ImportInput {action:'attach-cover'|'verify-cover'|'revoke-cover'|'attach-video'|'review-video';candidateId?:string;rightsEvidence?:string;sceneEvidence?:string;playbackVerified?:boolean;sceneMatch?:'verified'|'unverified';techniqueMatch?:'verified'|'unverified'}
export async function reviewMedia(root:string,i:MediaAction,request:typeof fetch=fetch) {
 required(i.reviewer,'Reviewer',120);required(i.notes,'Review notes',3000);
 const snapshot=(await readReferences(root)).find(c=>c.id===i.id);if(!snapshot||snapshot.version!==i.version)throw Error('Unknown or changed reference. Refresh.');
 if(i.action==='attach-video'){
  const v=snapshot.discovery?.videos.find(v=>v.id===i.candidateId);if(!v||!v.embedUrl)throw Error('Choose a supported discovered video.');required(i.sceneEvidence,'Scene match evidence',3000);
  if(snapshot.media?.sourceUrl!==v.sourceUrl){await importUrls(root,[{...i,sourceUrl:v.sourceUrl}],request);i={...i,version:i.version+1};}
 }
 return updateReferences(root,async records=>{const c=records.find(c=>c.id===i.id);if(!c||c.version!==i.version)throw Error('Reference changed. Refresh.');
  if(i.action==='attach-cover'){const cover=c.discovery?.covers.find(v=>v.id===i.candidateId);if(!cover||!validImage(cover.url))throw Error('Choose a discovered TMDB image.');c.cover={candidate:structuredClone(cover)};}
  else if(i.action==='verify-cover'){if(!c.cover)throw Error('Attach a cover first.');if(!mediaAvailability(root).tmdbLogo)throw Error('Configure an official TMDB_ATTRIBUTION_LOGO_URL before preview.');const evidence=required(i.rightsEvidence,'Image rights evidence',3000);const expiresAt=required(i.expiresAt,'Image permission expiry');if(!(Date.parse(expiresAt)>Date.now()))throw Error('Image permission expiry must be in the future.');c.cover.grant={evidence,expiresAt,reviewer:i.reviewer,verifiedAt:new Date().toISOString()};}
  else if(i.action==='revoke-cover'){if(c.cover)delete c.cover.grant;}
  else if(i.action==='attach-video'||i.action==='review-video'){if(!c.media)throw Error('Attach a video first.');const video=c.discovery?.videos.find(v=>v.sourceUrl===c.media?.sourceUrl);if(video?.duration&&c.media.duration===null)c.media.duration=video.duration;c.mediaReview={sourceUrl:c.media.sourceUrl,sceneEvidence:required(i.sceneEvidence,'Scene match evidence',3000),reviewer:i.reviewer,reviewedAt:new Date().toISOString(),playbackVerified:i.playbackVerified===true,sceneMatch:i.playbackVerified===true&&i.sceneMatch==='verified'?'verified':'unverified',techniqueMatch:i.playbackVerified===true&&i.sceneMatch==='verified'&&i.techniqueMatch==='verified'?'verified':'unverified'};}
  else throw Error('Unsupported media review action.');
  c.status='candidate';c.version++;c.audit.push({action:i.action,reviewer:i.reviewer,notes:i.notes,at:new Date().toISOString()});return c;
 });
}

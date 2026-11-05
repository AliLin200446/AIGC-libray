import type { ClipReference } from './types';
import type { Grant } from '../../server/film-references/types';
/** Deliberately separate from the private queue; only explicitly prepared public records enter here. */
export interface PublicFilm {
 id:string; film:string; year:number; title:string; description:string; technique:string; prompt:string;
 sourceUrl:string; attribution:string; embedUrl:string; startTime:number; endTime?:number; duration:number|null;
 sceneNote?:string;
 publicationApproved:boolean; review:{sceneEvidence:string;playbackVerified:boolean};
 embedGrant:Grant; publicDisplayGrant:Grant;
 thumbnail?:{url:string;displayGrant:Grant};
 cover?:{url:string;sourceUrl:string;attribution:string;logoUrl:string;publicDisplayGrant:Grant};
}
export function activeGrant(g:Grant|undefined,now=Date.now()) {return !!g&&typeof g.evidence==='string'&&!!g.evidence.trim()&&typeof g.reviewer==='string'&&!!g.reviewer.trim()&&Number.isFinite(Date.parse(g.verifiedAt))&&Date.parse(g.expiresAt)>now;}
export function permittedFilmEmbed(source:string,embed:string) {
 try{const s=new URL(source),e=new URL(embed);if(s.protocol!=='https:'||e.protocol!=='https:'||s.username||s.password||e.username||e.password||s.port||e.port||e.search||e.hash)return false;
 const id=s.hostname==='www.youtube.com'&&s.pathname==='/watch'?s.searchParams.get('v'):null;
 return !!(id&&/^[\w-]{11}$/.test(id)&&['www.youtube.com','www.youtube-nocookie.com'].includes(e.hostname)&&e.pathname===`/embed/${id}`)||s.hostname==='vimeo.com'&&/^\/\d+$/.test(s.pathname)&&e.hostname==='player.vimeo.com'&&e.pathname===`/video${s.pathname}`;
 }catch{return false;}
}
export function permittedCover(url:string){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='image.tmdb.org'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&/^\/t\/p\/(w\d+|original)\/[\w.-]+\.(jpg|png|webp|svg)$/.test(u.pathname);}catch{return false;}}
/** Only a provider-returned thumbnail for this exact source may be displayed. */
export function permittedThumbnail(source:string,url:string) {
 try {const id=new URL(source).searchParams.get('v');const u=new URL(url);
 return !!id&&/^[\w-]{11}$/.test(id)&&u.origin==='https://i.ytimg.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&u.pathname===`/vi/${id}/hqdefault.jpg`;
 }catch{return false;}
}
export function filmClips(records:readonly unknown[],now=Date.now()):ClipReference[] {
 const result:ClipReference[]=[];const seen=new Set<string>();
 for(const raw of records){try{const r=raw as PublicFilm;
 if(!r||!/^film-discovery-(0[1-9]|1[0123])$/.test(r.id)||seen.has(r.id)||r.publicationApproved!==true||r.review?.playbackVerified!==true||!r.review.sceneEvidence?.trim()||!activeGrant(r.embedGrant,now)||!activeGrant(r.publicDisplayGrant,now)||!permittedFilmEmbed(r.sourceUrl,r.embedUrl))continue;
 if(!Number.isInteger(r.year)||r.year<1888||r.year>2100||![r.film,r.title,r.description,r.technique,r.prompt,r.attribution].every(v=>typeof v==='string'&&v.trim()&&v.length<=12000))continue;
 if(!Number.isFinite(r.startTime)||r.startTime<0||r.endTime!==undefined&&(!Number.isFinite(r.endTime)||r.endTime<=r.startTime)||r.duration!==null&&(!Number.isFinite(r.duration)||r.duration<=0||r.startTime>=r.duration||r.endTime!==undefined&&r.endTime>r.duration))continue;
 const cover=r.cover&&activeGrant(r.cover.publicDisplayGrant,now)&&permittedCover(r.cover.url)&&permittedCover(r.cover.logoUrl)&&r.cover.attribution?.trim()&&/^https:\/\/www.themoviedb.org\/movie\/\d+$/.test(r.cover.sourceUrl)?r.cover:undefined;
 const thumbnail=r.thumbnail&&activeGrant(r.thumbnail.displayGrant,now)&&permittedThumbnail(r.sourceUrl,r.thumbnail.url)?r.thumbnail:undefined;
 const unavailable={value:null,status:'unavailable' as const,confidenceState:'insufficient evidence' as const,evidenceObservationIds:[],evidence:[],source:'No temporal analysis supplied.'};
 const movement={...unavailable,value:r.technique,status:'inferred' as const,evidence:[r.review.sceneEvidence],source:'Human-reviewed scene; production technique remains an inference.'};
 result.push({id:r.id,title:r.title,description:r.description,videoUrl:null,posterUrl:thumbnail?.url??cover?.url??'/clips/static.svg',duration:r.endTime!==undefined?r.endTime-r.startTime:r.duration,categories:{cameraMovement:[],composition:[],lens:[],lighting:[]},controlIds:[],cameraMovement:movement,framing:unavailable,cameraAngle:unavailable,lens:unavailable,lighting:unavailable,subjectMotion:unavailable,movementSpeed:unavailable,prompt:r.prompt,source:{title:r.film,url:r.sourceUrl,attribution:r.attribution,kind:'licensed'},license:{name:'Official player only',url:r.embedUrl.includes('vimeo.com')?'https://vimeo.com/terms':'https://www.youtube.com/static?template=terms',notes:'No downloading, rehosting, or AI analysis rights granted. Provider restrictions apply.'},observations:[{id:r.id+'-scene-review',category:'foreground-background',statement:r.review.sceneEvidence,evidence:[r.sourceUrl],confidenceState:'moderate evidence',region:null,anchor:null,lines:[]}],inferences:[movement],confidence:'insufficient evidence',evidence:[],film:{...(r.duration!==null?{uploadDuration:r.duration}:{}),title:r.film,year:r.year,embedUrl:r.embedUrl,startTime:r.startTime,...(typeof r.sceneNote==='string'&&r.sceneNote.length<=2000?{sceneNote:r.sceneNote}:{}),...(thumbnail?{thumbnail:{url:thumbnail.url,expiresAt:thumbnail.displayGrant.expiresAt}}:{}),...(r.endTime!==undefined?{endTime:r.endTime}:{}),expiresAt:new Date(Math.min(Date.parse(r.embedGrant.expiresAt),Date.parse(r.publicDisplayGrant.expiresAt))).toISOString(),...(cover?{cover:{url:cover.url,attribution:cover.attribution,sourceUrl:cover.sourceUrl,logoUrl:cover.logoUrl,expiresAt:cover.publicDisplayGrant.expiresAt}}:{})}});seen.add(r.id);
 }catch{ /* Malformed or revoked public records stay unpublished. */ }}return result;
}

import type { ClipReference } from './types';
import type { ClipPage, ClipParam, MovementKind, EvidenceLevel } from './clip-model';
import { permittedFilmEmbed } from './film';

export interface ClipPageContext { index?:number; backHref?:string; prev?:ClipPage['prev']; next?:ClipPage['next']; now?:number }
const clean = (text:string) => text.replace(/https?:\/\/\S+/g,'').replace(/\[\s*\]/g,'').trim();
const level = (text:string):EvidenceLevel => text.startsWith('strong')?'strong':text.startsWith('moderate')?'moderate':text.startsWith('weak')?'weak':'insufficient';
export function toClipPage(r:ClipReference, ctx:ClipPageContext={}):ClipPage {
 const now=ctx.now??Date.now();
 const describe=(value:string|null)=>value??'Unavailable · footage required';
 const rows:readonly (readonly [string,string])[]=r.curated?.parameters??[
  ['Camera movement',describe(r.cameraMovement.value)],['Shot size',describe(r.framing.value)],['Camera angle',describe(r.cameraAngle.value)],['Lens characteristics',describe(r.lens.value)],['Subject movement',describe(r.subjectMotion.value)],['Movement speed',describe(r.movementSpeed.value)],['Lighting',describe(r.lighting.value)],['Confidence',r.confidence],
 ];
 const params:ClipParam[]=rows.filter(([label])=>label!=='Negative constraints').map(([label,value])=>({label,value:clean(value.replace(/\bunknown\b/gi,'').replace(/;\s*$/,'')),status:/unavailable/i.test(value)?'unavailable':/unknown|unverified/i.test(value)?'unknown':'authored',family:/lens/i.test(label)?'lens':/light/i.test(label)?'light':/framing|shot size|position|spatial/i.test(label)?'composition':'camera'}));
 const authored=rows.map(([,v])=>v).join(' ');
 const movement=(r.curated?.technique??r.categories.cameraMovement[0]??r.id).toLowerCase();
 let kind:MovementKind='static';
 if(/tracking/.test(movement))kind=/following|behind|rear/i.test(authored)?'track-follow':'track-lateral';
 else if(r.id==='dolly-out')kind='dolly-out';
 else if(/dolly/.test(movement)&&!/zoom/.test(movement))kind='dolly-in';
 else for(const k of ['pan','tilt','orbit','crane','handheld','static'] as const)if(movement.includes(k))kind=k;
 const film=r.film;
 let media:ClipPage['media']={kind:'pending',note:r.curated?'Original schematic study; exact scene and public display permission are not implied.':'This is a study brief. Parameters remain unavailable until footage is reviewed.'};
 if(film&&Date.parse(film.expiresAt)>now&&permittedFilmEmbed(r.source.url??'',film.embedUrl)){
  const url=new URL(film.embedUrl); const youtube=url.hostname.includes('youtube');
  if(youtube)url.hostname='www.youtube-nocookie.com';
  url.searchParams.set('start',String(Math.floor(film.startTime)));if(film.endTime!==undefined)url.searchParams.set('end',String(Math.floor(film.endTime)));
  media={kind:'official',provider:youtube?'youtube':'vimeo',embedUrl:url.href,pageUrl:r.source.url!,uploadTitle:r.source.attribution.split('YouTube · ')[1]??r.source.title,channel:r.source.attribution.split(' / ')[0]??r.source.attribution,expiresAt:film.expiresAt,
   ...(film.uploadDuration??r.duration?{durationSec:film.uploadDuration??r.duration!}:{}),
   ...(film.endTime!==undefined?{studied:{start:film.startTime,end:film.endTime,label:'Provider timestamp selection; not frame-accurate trimming'}}:{}),
  };
  // No remote thumbnail request before consent. The facade remains an intentional graphic.
 }
 if(r.videoUrl&&r.source.kind==='licensed')media={kind:'hosted',url:r.videoUrl,posterUrl:r.posterUrl,attribution:r.source.attribution};
 // Existing records contain prose and qualitative confidence, not authored 0–5 claim ratings.
 // Preserve their prose once rather than manufacturing a claims table from it.
 const prose=[...r.observations.map(o=>o.statement),...r.inferences.flatMap(i=>i.evidence),...r.evidence.map(e=>`${e.startSeconds}–${e.endSeconds}s / ${e.cue}`)].map(clean).filter(Boolean);
 const unique=[...new Set(prose)];
 const sources:ClipPage['sources']=[{role:r.demonstration?'Media · original project asset':r.film?'Media · official upload':'Source candidate',title:clean(r.source.title),publisher:clean(r.source.attribution),...(r.source.url?{url:r.source.url}:{})},{role:'Rights',title:clean(r.license.name),publisher:'Usage restrictions apply',...(r.license.url?{url:r.license.url}:{})},...(r.curated?.research??[]).map(s=>({role:'Technique research · not scene verification',title:s.title,publisher:'Research source',url:s.url}))];
 for(const id of r.controlIds)sources.push({role:'Related control',title:id,publisher:'FRAMEFIELD',url:`/library/${id}`});
 return {id:r.id,collection:r.demonstration?'Original demonstration':r.curated?'Film discovery':'Schematic',...(ctx.index!==undefined?{index:ctx.index}:{}),title:r.title,...(r.curated?{subtitle:`${r.curated.year} · ${r.curated.scene}`}:{tagline:r.description}),technique:r.description,tags:[],media,
 status:{media:media.kind==='hosted'?'Original FRAMEFIELD motion clip.':media.kind==='official'?'Official upload. Rights stay with source.':'Footage pending.',parameters:r.curated?'Authored direction, not measured.':'Unavailable · footage required',evidence:level(r.confidence)},
 setup:{kind,height:/\blow\b/i.test(authored)?'low':/\bhigh\b/i.test(authored)?'high':'eye',distance:/close-up/i.test(authored)?'close':/wide shot/i.test(authored)?'far':'medium',fov:/wide field|wide-like/i.test(authored)?'wide':/narrow field|telephoto/i.test(authored)?'narrow':'normal',environment:/corridor|hallway/i.test(authored)?'corridor':'open'},
 setupNote:(/dolly zoom/i.test(r.curated?.technique??'')?'Dolly zoom is not represented by this static diagram. ':'')+'Relative authored diagram, not a measured film setup. Undescribed geometry uses illustrative defaults.'+(r.curated?.unsupported?` ${r.curated.unsupported}`:''),params,
 negatives:(rows.find(([k])=>k==='Negative constraints')?.[1]??'').replace(/^No\s+/i,'').split(/,|\bor\b/i).map(s=>s.trim()).filter(Boolean).map(s=>s[0]!.toUpperCase()+s.slice(1)),
 prompt:r.prompt,promptNote:'Creative direction · not capture metadata',composeHref:`/compose/workspace?shot=1&clip=${encodeURIComponent(r.id)}`,claims:[],claimsEmpty:unique.join('\n\n')||(r.demonstration?'Original authored animation. The reproducible renderer defines the camera path and stationary geometry; no film analysis or recovered production settings are claimed.':'No footage reviewed. No visual observations recorded.'),sources,
 rights:[r.license.notes,film?.sceneNote,...r.limitations??[]].filter(Boolean).map(s=>clean(s!)).join('\n\n'),backHref:ctx.backHref??'/explore',...(ctx.prev?{prev:ctx.prev}:{}),...(ctx.next?{next:ctx.next}:{})};
}

import type { ClipReference } from '../clips/types';
import { toClipPage } from '../clips/clip-adapter';
import type { StudiesModel, Movement, ShotSize } from './studies-model';
export function toStudiesModel(registry:readonly ClipReference[]):StudiesModel {
 return {kicker:'Moving image / reference collection',titleLines:['Camera in','motion'],lede:'Study the movement. Read the frame. Translate a point of view into a precise video prompt.',disclaimer:'Camera prompts are authored creative directions, not AI-generated analysis. Film studies show a schematic, never film frames, until a cleared still exists.',mosaic:{scene:'tracking',caption:'Tracking · subject → · camera holds distance',animate:true},tabs:[{label:'Camera studies',sub:`${registry.length} references with authored prompts`,href:'/explore',current:true,family:'camera'},{label:'Analyze your own image',sub:'Coming soon · not available',href:'/analyze',current:false,family:'lens'}],hrefFor:s=>`/explore/${encodeURIComponent(s.slug)}`,studies:registry.map((r,i)=>{
 const page=toClipPage(r); const original=!!r.demonstration;
 const technique=r.curated?.technique??r.description;
 const movement:Movement=/dolly/i.test(technique)?'dolly':(['tracking','pan','orbit','tilt','crane','handheld'] as const).find(k=>technique.toLowerCase().includes(k))??'static';
 const size:ShotSize=r.categories.composition.includes('Wide Shot')?'wide':r.categories.composition.includes('Close-Up')?'close':'medium';
 const available=page.media.kind==='official'||page.media.kind==='hosted';
 const duration=page.media.kind==='official'?page.media.studied? page.media.studied.end-page.media.studied.start:page.media.durationSec:page.media.kind==='hosted'?r.duration:undefined;
 return {no:String(i+1).padStart(2,'0'),slug:r.id,source:original?'original':'film',movement,movementLabel:technique,size,title:r.title,sourceLine:original?r.source.attribution:`${r.curated?.year??''} · ${page.media.kind==='official'?'Official player':'Source link only'} · ${r.source.attribution.split(' · ')[0]}`,...(duration!=null?{durationSec:duration}:{}),awaitingFootage:!available,chips:[`${size==='close'?'Close-up':size[0]!.toUpperCase()+size.slice(1)} shot`,...r.categories.lens.map(l=>`${l} lens`),...(!original?[`Evidence · ${page.status.evidence}`]:[])],thumb:original&&page.media.kind==='hosted'?{type:'render',src:page.media.posterUrl,previewSrc:page.media.url,alt:`${r.title} — original FRAMEFIELD render`}:{type:'schematic',setup:page.setup!}};
 })};
}

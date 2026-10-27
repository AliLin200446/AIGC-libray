import { controls } from '../../controls';
import approved from '../../references/approved.json';
import { publicReferences } from '../../references/schema';
import { el,link,button,heading } from '../dom';
/** An explicit renderer allowlist; unsupported providers always retain the source link. */
function permittedEmbed(url:string):boolean {
 const u=new URL(url);
 if([...u.searchParams].some(([key,value])=>!['start','end'].includes(key)||!/^\d+$/.test(value)))return false;
 return (['www.youtube-nocookie.com','www.youtube.com'].includes(u.hostname)&&/^\/embed\/[\w-]+$/.test(u.pathname)&&!u.searchParams.has('autoplay'))||(u.hostname==='player.vimeo.com'&&/^\/video\/\d+$/.test(u.pathname)&&!u.searchParams.has('autoplay'));
}
export function realWorldReferences(controlId:string,records:readonly unknown[]=approved):HTMLElement|null {
 const references=publicReferences(records,controlId,controls.map(c=>c.id));if(!references.length)return null;
 const section=el('section','detail-section real-world-references');section.append(heading('IN PRACTICE','Real-world references'));
 for(const reference of references){
  const article=el('article','real-world-reference');article.append(el('h3','',reference.title),el('p','section-note',[reference.work,reference.creator,reference.year].filter(Boolean).join(' / ')));
  if(reference.thumbnail){const image=el('img');image.src=reference.thumbnail;image.alt=reference.title;image.loading='lazy';image.referrerPolicy='no-referrer';image.style.maxWidth='100%';article.append(image);}
  if(reference.embedUrl&&reference.rightsStatus==='official-embed'&&permittedEmbed(reference.embedUrl)){
   const play=button('LOAD OFFICIAL PLAYER ↗',()=>{const frame=el('iframe');frame.src=reference.embedUrl!;frame.title=reference.title;frame.loading='lazy';frame.allow='fullscreen';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');frame.style.width='100%';frame.style.aspectRatio='16 / 9';article.append(frame);play.remove();});article.append(play,el('p','section-note','The source link remains available if the provider or site policy blocks embedding.'));
  }
  if(reference.startTime!==undefined)article.append(el('p','section-note',`Relevant passage: ${reference.startTime}s${reference.endTime!==undefined?`–${reference.endTime}s`:''}`));
  for(const [label,text]of [['OBSERVE',reference.observation],['DEMONSTRATES',reference.demonstrates],['NOT TO CONFUSE WITH',reference.notToConfuseWith]])article.append(el('h4','eyebrow',label),el('p','',text));
  article.append(el('p','section-note',reference.attribution));const source=link(reference.sourceUrl,'VIEW SOURCE ↗');source.target='_blank';source.rel='noopener noreferrer';article.append(source);section.append(article);
 }
 return section;
}

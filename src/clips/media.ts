import { permittedFilmEmbed } from './film';
import { el } from '../library/dom';
import type { ClipReference } from './types';

let activePreview: (() => void) | null = null;

/** Sources are attached only on intent. No metadata requests from the grid. */
export function clipMedia(clip: ClipReference, selected = false) {
  const root = el('div', 'clip-media');
  const coverAllowed=()=>!clip.film || !!((clip.film.thumbnail&&Date.parse(clip.film.thumbnail.expiresAt)>Date.now())||(clip.film.cover&&Date.parse(clip.film.cover.expiresAt)>Date.now()));
  const hasFilmCover=()=>!!clip.film&&coverAllowed();
  const hasCover=()=>hasFilmCover()||!!(clip.videoUrl&&clip.source.kind==='licensed');
  const poster = el('img');
  const status = el('span', 'clip-media-status technical');
  function fallback() {
    if(clip.curated){poster.hidden=true;poster.removeAttribute('src');root.classList.add('clip-media--unavailable');status.textContent='SCENE COVER UNAVAILABLE / NOT FILM FOOTAGE';}
    else {poster.src='/clips/static.svg';status.textContent='SCHEMATIC / FOOTAGE PENDING';}
    status.hidden=false;
  }
  if(clip.curated&&!hasCover())fallback();else poster.src=coverAllowed()?clip.posterUrl:'/clips/static.svg';
  poster.referrerPolicy='no-referrer';poster.addEventListener('error',fallback);
  poster.alt = selected ? `${clip.title} — reference poster` : '';
  poster.width = 800; poster.height = 450; poster.loading = selected ? 'eager' : 'lazy';
  root.append(poster);
  if(!clip.curated||hasCover())status.textContent=clip.film?'YOUTUBE / OPEN TO PLAY':clip.videoUrl?(selected?'PRESS PLAY TO INSPECT':'HOVER TO PREVIEW'):'SCHEMATIC / FOOTAGE PENDING';
  root.append(status);
  if(clip.curated&&!clip.demonstration&&!hasCover()){const title=el('div','clip-film-reference-title',clip.title);title.append(el('small','',clip.film?'FILM REFERENCE · OFFICIAL PLAYER':'FILM REFERENCE · SOURCE LINK'));root.append(title);}
  if((clip.film||clip.videoUrl)&&!selected){const play=el('span','clip-play-affordance','▶');play.setAttribute('aria-hidden','true');root.append(play);}
  let frame:HTMLIFrameElement|null=null;
  const video = clip.videoUrl ? el('video') : null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let hovered = false;
  let visible = true;
  let disposed = false;
  let revision = 0;
  const pause = () => { revision++; video?.pause(); if(video&&!selected){try{video.currentTime=0;}catch{ /* No loaded timeline yet. */ }video.hidden=true;status.hidden=false;}if(activePreview===pause)activePreview=null; if(frame){frame.remove();frame=null;root.querySelector<HTMLButtonElement>('button')?.removeAttribute('hidden');status.hidden=false;} };
  function load() {
    if (video && clip.videoUrl && !video.hasAttribute('src')) { video.src = clip.videoUrl; video.load(); }
  }
  async function preview() {
    if (!video || selected || !hovered || !visible || motion.matches || document.hidden || disposed) return;
    if(activePreview&&activePreview!==pause)activePreview();activePreview=pause;
    load(); const current = ++revision;
    try {
      await video.play();
      if (disposed || !hovered || !visible || motion.matches || document.hidden) video.pause();
      else if (current === revision) {status.hidden = true;video.hidden=false;}
    } catch { if (!disposed) { status.textContent = 'PREVIEW UNAVAILABLE / OPEN TO INSPECT'; status.hidden = false; } }
  }
  if (video) {
    video.preload = 'none'; video.poster = clip.posterUrl; video.muted = true;video.hidden=!selected;
    video.playsInline = true; video.controls = selected; video.loop = !selected;
    video.setAttribute('aria-label', `${clip.title} video`);
    if (!selected) { video.tabIndex = -1; video.setAttribute('aria-hidden', 'true'); }
    video.addEventListener('playing', () => { if (!visible || document.hidden || disposed) pause(); else status.hidden = true; });
    video.addEventListener('error', () => { pause(); status.hidden = false; status.textContent = 'VIDEO UNAVAILABLE / CHECK SOURCE'; });
    root.insertBefore(video, status);
    if (selected) load();
  }
  let expiryTimer:ReturnType<typeof setInterval>|undefined;
  if(clip.film) {
    const film=clip.film;
    const allowed=()=>Date.parse(film.expiresAt)>Date.now()&&permittedFilmEmbed(clip.source.url??'',film.embedUrl);
    const loadPlayer=el('button','clip-copy technical','LOAD OFFICIAL PLAYER');loadPlayer.type='button';
    loadPlayer.addEventListener('click',()=>{if(!allowed()){status.textContent='DISPLAY PERMISSION EXPIRED / VIEW SOURCE';return;}frame=el('iframe');const url=new URL(film.embedUrl);url.searchParams.set('start',String(Math.floor(film.startTime)));if(film.endTime!==undefined)url.searchParams.set('end',String(Math.floor(film.endTime)));frame.src=url.href;frame.title=clip.title;frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');root.append(frame);loadPlayer.hidden=true;status.hidden=true;});
    if(selected)root.append(loadPlayer);
    expiryTimer=setInterval(()=>{if(!allowed()){frame?.remove();frame=null;loadPlayer.disabled=true;status.hidden=false;status.textContent='DISPLAY PERMISSION EXPIRED / VIEW SOURCE';}if((film.thumbnail&&Date.parse(film.thumbnail.expiresAt)<=Date.now())||(film.cover&&Date.parse(film.cover.expiresAt)<=Date.now()))fallback();},4000);
  }
  const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (!visible) pause(); }, { threshold: 0.15 });
  observer.observe(root);
  const visibility = () => { if (document.hidden) pause(); };
  const reduced = () => { if (motion.matches) pause(); };
  document.addEventListener('visibilitychange', visibility); motion.addEventListener('change', reduced);
  return {
    root,
    enter() { hovered = true; void preview(); },
    leave() { hovered = false; pause(); },
    dispose() { disposed = true; clearInterval(expiryTimer); pause(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', reduced); if (video) { video.removeAttribute('src'); video.load(); } },
  };
}

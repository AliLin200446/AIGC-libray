import { el } from '../library/dom';
import type { ClipReference } from './types';

/** Sources are attached only on intent. No metadata requests from the grid. */
export function clipMedia(clip: ClipReference, selected = false) {
  const root = el('div', 'clip-media');
  const poster = el('img'); poster.src = clip.posterUrl; poster.alt = selected ? `${clip.title} — reference poster` : '';
  poster.width = 800; poster.height = 450; poster.loading = selected ? 'eager' : 'lazy';
  root.append(poster);
  const status = el('span', 'clip-media-status technical', clip.videoUrl ? (selected ? 'PRESS PLAY TO INSPECT' : 'HOVER TO PREVIEW') : 'SCHEMATIC / FOOTAGE PENDING');
  root.append(status);
  const video = clip.videoUrl ? el('video') : null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let hovered = false;
  let visible = true;
  let disposed = false;
  let revision = 0;
  const pause = () => { revision++; video?.pause(); };
  function load() {
    if (video && clip.videoUrl && !video.hasAttribute('src')) { video.src = clip.videoUrl; video.load(); }
  }
  async function preview() {
    if (!video || selected || !hovered || !visible || motion.matches || document.hidden || disposed) return;
    load(); const current = ++revision;
    try {
      await video.play();
      if (disposed || !hovered || !visible || motion.matches || document.hidden) video.pause();
      else if (current === revision) status.hidden = true;
    } catch { if (!disposed) { status.textContent = 'PREVIEW UNAVAILABLE / OPEN TO INSPECT'; status.hidden = false; } }
  }
  if (video) {
    video.preload = 'none'; video.poster = clip.posterUrl; video.muted = true;
    video.playsInline = true; video.controls = selected; video.loop = !selected;
    video.setAttribute('aria-label', `${clip.title} video`);
    if (!selected) { video.tabIndex = -1; video.setAttribute('aria-hidden', 'true'); }
    video.addEventListener('playing', () => { if (!visible || document.hidden || disposed) pause(); else status.hidden = true; });
    video.addEventListener('error', () => { status.hidden = false; status.textContent = 'VIDEO UNAVAILABLE / CHECK SOURCE'; });
    root.insertBefore(video, status);
    if (selected) load();
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
    dispose() { disposed = true; pause(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); motion.removeEventListener('change', reduced); if (video) { video.removeAttribute('src'); video.load(); } },
  };
}

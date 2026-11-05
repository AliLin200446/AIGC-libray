import { toStudiesModel } from '../studies/studies-adapter';
import { renderStudiesPage } from '../studies/studies-page';
import { isPrototypeReference } from './originals';
import { pixelComposition } from './pixel-composition';
import { toClipPage } from './clip-adapter';
import { renderClipPage } from './clip-page';
import { archiveShell, archiveFooter, pageTitle } from '../library/archive';
import { el, link, button } from '../library/dom';
import { clips } from './catalog';
import { filterGroups } from './types';
import type { ClipReference } from './types';
import { groups, groupLabels, parseFilters, filterSearch, filterClips } from './model';
import { clipMedia } from './media';
import './clips.css';

export function renderClips(app: HTMLElement) {
  let cleanup: (() => void)[] = [];
  const oldScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  function disposeView() { cleanup.forEach(fn => fn()); cleanup = []; }
  function remember() { history.replaceState({ ...history.state, clipScroll: scrollY }, '', location.href); }
  function navigate(url: string) {
    remember(); history.pushState({ clipScroll: 0, clipInternal: true }, '', url); render(true);
  }
  function localLink(href: string, label: string, className = '') {
    const a = link(href, label, className);
    a.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); navigate(a.pathname + a.search);
    }); return a;
  }
  function render(focus = false) {
    disposeView(); archiveShell(app); document.body.classList.add('clips-page');
    const main = el('main', 'clips-main'); main.id = 'clip-content'; main.tabIndex = -1;
    const id = location.pathname.replace(/\/$/, '').split('/')[2];
    if (id) {
      const clip = clips.find(item => item.id === id);
      if (clip) detail(main, clip);
      else { document.title = 'Clip not found — Framefield'; main.append(pageTitle('CLIP / UNAVAILABLE', 'Clip not found', 'This reference is not in the collection.'), localLink('/explore', '← BROWSE CLIPS', 'technical-action')); }
    } else library(main);
    const footer = archiveFooter();
    app.append(main, footer);
    if (!id) cleanup.push(pixelComposition(footer, 'footer'));
    const top = Number(history.state?.clipScroll) || 0;
    if (focus) main.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      scrollTo(0, top);
      if (focus && !id && history.state?.clipFocus) main.querySelector<HTMLAnchorElement>(`[data-clip="${CSS.escape(history.state.clipFocus)}"]`)?.focus({ preventScroll: true });
    });
  }
  function collectionSearch(filters: Parameters<typeof filterSearch>[0]) {
    const query = new URLSearchParams(filterSearch(filters));
    if (new URLSearchParams(location.search).get('all') === '1') query.set('all', '1');
    return query.size ? '?' + query.toString() : '';
  }
  function library(main: HTMLElement) {
    if(new URLSearchParams(location.search).get('all')!=='1') {
      document.title='Camera studies — Framefield';
      cleanup.push(renderStudiesPage(main,toStudiesModel(clips.filter(isPrototypeReference))));
      main.querySelectorAll<HTMLAnchorElement>('.st-card').forEach(a=>a.addEventListener('click',event=>{
        if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();navigate(a.pathname+a.search);
      }));
      return;
    }
    const collection = new URLSearchParams(location.search).get('all') === '1' ? clips : clips.filter(isPrototypeReference);
    main.append(localLink(collection.length === clips.length ? '/explore' : '/explore?all=1', collection.length === clips.length ? 'CURATED SIX →' : 'ALL CAMERA STUDIES →', 'technical-action'));
    main.append(link('/explore?image=1','ANALYZE YOUR OWN IMAGE →','technical-action'));
    document.title = 'Cinematic clips — Framefield';
    const hero = pageTitle('MOVING IMAGE / REFERENCE COLLECTION', 'Camera in motion.', collection.length === 6 ? 'Two film references. Four original motion studies. Carefully authored camera prompts. Explore the technique, then make it your own.' : 'Camera studies and curated cinematic references. Explore the technique, then make it your own.');
    main.append(hero);
    cleanup.push(pixelComposition(hero, 'hero'));
    const pending = collection.filter(clip => !clip.videoUrl && !clip.film).length;
    const note = el('p', 'clip-collection-note', `${String(collection.length).padStart(2, '0')} studies · ${pending ? `${pending} awaiting footage. Uncleared film covers remain unavailable. Curated Camera Prompts are authored creative directions, not AI-generated analysis.` : 'Moving-image references. Review observations and inferred techniques in each study.'}`);
    main.append(note);
    const layout = el('div', 'clip-layout');
    const sidebar = el('aside', 'clip-filters');sidebar.dataset.ffNoTrail=''; sidebar.setAttribute('aria-label', 'Filter clips');
    const filters = parseFilters(location.search);
    const controls: HTMLInputElement[] = [];
    const results = el('section', 'clip-results'); results.setAttribute('aria-label', 'Clip collection');
    const toolbar = el('div', 'clip-toolbar technical');
    const count = el('span'); count.setAttribute('role', 'status');
    toolbar.append(count, el('span', '', 'SELECT A STUDY ↗'));
    const grid = el('div', 'clip-grid');
    let mediaCleanup: (() => void)[] = [];
    cleanup.push(() => mediaCleanup.forEach(fn => fn()));
    function update(push = true) {
      if (push) { remember(); history.pushState({ clipScroll: scrollY, clipInternal: true }, '', '/explore' + collectionSearch(filters)); }
      mediaCleanup.forEach(fn => fn()); mediaCleanup = []; grid.replaceChildren();
      const visible = filterClips(collection, filters);
      count.textContent = `${String(visible.length).padStart(2, '0')} / ${String(collection.length).padStart(2, '0')} STUDIES`;
      clear.disabled = !groups.some(group => filters[group].length);
      for (const clip of visible) {
        const card = localLink(`/explore/${clip.id}${collectionSearch(filters)}`, '', 'clip-card'); card.dataset.clip = clip.id;
        card.addEventListener('click', () => { history.replaceState({ ...history.state, clipFocus: clip.id }, '', location.href); }, { capture: true });
        const media = clipMedia(clip); mediaCleanup.push(media.dispose);
        card.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') media.enter(); });
        card.addEventListener('pointerleave', media.leave);
        const caption = el('div', 'clip-caption');
        caption.append(el('span', 'technical', `${String(collection.indexOf(clip) + 1).padStart(2, '0')} / ${clip.categories.cameraMovement.join(' + ')}`), el('span', 'technical', clip.duration === null ? '— SEC' : `${clip.duration.toFixed(1)} SEC`), el('h2', '', clip.title), el('span', 'clip-arrow', '↗'), el('p', '', clip.description));
        if(clip.demonstration)caption.append(el('p','technical','ORIGINAL FRAMEFIELD DEMONSTRATION · NOT A FILM SCENE'));
        if(clip.film)caption.append(el('p','technical',`${clip.film.title} (${clip.film.year}) · ${clip.source.attribution}`));card.append(media.root, caption); grid.append(card);
      }
      if (!visible.length) {
        const empty = el('div', 'clip-empty'); empty.append(el('h2', '', 'No matching studies.'), el('p', '', 'Try fewer filters or clear the selection to see the full collection.'), button('CLEAR FILTERS', reset)); grid.append(empty);
      }
    }
    function reset() { for (const group of groups) filters[group] = []; controls.forEach(input => { input.checked = false; }); update(); }
    const clear = button('CLEAR FILTERS', reset, 'technical');
    sidebar.append(el('h2', 'technical', 'REFINE THE FRAME'), el('p', 'clip-filter-help', 'Match any tag within a group, and every selected group.'), clear);
    for (const group of groups) {
      const tags = collection.length === clips.length ? filterGroups[group] : filterGroups[group].filter(tag => collection.some(c => (c.categories[group] as readonly string[]).includes(tag)));
      if (!tags.length) continue;
      const field = el('fieldset'); field.append(el('legend', 'technical', groupLabels[group]));
      for (const tag of tags) {
        const label = el('label'); const input = el('input'); input.type = 'checkbox'; input.checked = filters[group].includes(tag);
        input.addEventListener('change', () => { filters[group] = input.checked ? [...filters[group], tag] : filters[group].filter(value => value !== tag); update(); });
        label.append(input, el('span', '', tag)); field.append(label); controls.push(input);
      } sidebar.append(field);
    }
    results.append(toolbar, grid); layout.append(sidebar, results); main.append(layout); update(false);
  }
  function detail(main: HTMLElement, clip: ClipReference) {
    document.title = `${clip.title} — Framefield Clips`;
    main.classList.add('clip-detail');
    const collection = isPrototypeReference(clip) ? clips.filter(isPrototypeReference) : clips;
    const index=collection.indexOf(clip);
    const neighbor=(offset:number)=>{const c=collection[index+offset];return c?{href:`/explore/${c.id}`,label:c.title}:undefined;};
    const model=toClipPage(clip,{index:index+1,backHref:'/explore'+collectionSearch(parseFilters(location.search)),prev:neighbor(-1),next:neighbor(1)});
    if(import.meta.env.DEV&&clip.curated&&!clip.demonstration)model.sources.push({role:'Local review',title:'Review existing local source',publisher:'Private Admin',url:`/admin/references?id=${clip.id}`});
    cleanup.push(renderClipPage(main,model));
    main.querySelectorAll<HTMLAnchorElement>('.cp-crumbs a').forEach(a=>a.addEventListener('click',event=>{
      if(event.button||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      if(a.closest('[aria-label="Breadcrumb"]')&&history.state?.clipInternal)history.back();
      else navigate(a.pathname+a.search);
    }));
  }

  const popstate = () => render(true);
  const pagehide = (event: PageTransitionEvent) => { remember(); if (!event.persisted) dispose(); };
  function dispose() { disposeView(); window.removeEventListener('popstate', popstate); window.removeEventListener('pagehide', pagehide); history.scrollRestoration = oldScrollRestoration; }
  window.addEventListener('popstate', popstate); window.addEventListener('pagehide', pagehide);
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  render();
}

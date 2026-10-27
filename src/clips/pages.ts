import { archiveShell, archiveFooter, pageTitle, specTable } from '../library/archive';
import { el, link, button } from '../library/dom';
import { confidenceDefinitions } from '../library/reference/types';
import type { Finding } from '../library/reference/types';
import { clips } from './catalog';
import { filterGroups } from './types';
import type { ClipReference } from './types';
import { groups, groupLabels, parseFilters, filterSearch, filterClips } from './model';
import { clipMedia } from './media';
import './clips.css';

export function renderClips(app: HTMLElement) {
  let cleanup: (() => void)[] = [];
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  const oldScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  function disposeView() { cleanup.forEach(fn => fn()); cleanup = []; clearTimeout(copyTimer); }
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
      else { document.title = 'Clip not found — Framefield'; main.append(pageTitle('CLIP / UNAVAILABLE', 'Clip not found', 'This reference is not in the collection.'), localLink('/clips', '← BROWSE CLIPS', 'technical-action')); }
    } else library(main);
    app.append(main, archiveFooter());
    const top = Number(history.state?.clipScroll) || 0;
    if (focus) main.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      scrollTo(0, top);
      if (focus && !id && history.state?.clipFocus) main.querySelector<HTMLAnchorElement>(`[data-clip="${CSS.escape(history.state.clipFocus)}"]`)?.focus({ preventScroll: true });
    });
  }
  function library(main: HTMLElement) {
    document.title = 'Cinematic clips — Framefield';
    main.append(pageTitle('MOVING IMAGE / REFERENCE COLLECTION', 'Camera in motion.', 'Study the movement. Read the frame. Translate a point of view into a precise video prompt.'));
    const pending = clips.filter(clip => !clip.videoUrl).length;
    const note = el('p', 'clip-collection-note', `${String(clips.length).padStart(2, '0')} studies · ${pending ? `${pending} awaiting footage. Schematics are placeholders; their tags describe intended examples, not verified observations.` : 'Moving-image references. Review observations and inferred techniques in each study.'}`);
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
      if (push) { remember(); history.pushState({ clipScroll: scrollY, clipInternal: true }, '', '/clips' + filterSearch(filters)); }
      mediaCleanup.forEach(fn => fn()); mediaCleanup = []; grid.replaceChildren();
      const visible = filterClips(clips, filters);
      count.textContent = `${String(visible.length).padStart(2, '0')} / ${String(clips.length).padStart(2, '0')} STUDIES`;
      clear.disabled = !groups.some(group => filters[group].length);
      for (const clip of visible) {
        const card = localLink(`/clips/${clip.id}${filterSearch(filters)}`, '', 'clip-card'); card.dataset.clip = clip.id;
        card.addEventListener('click', () => { history.replaceState({ ...history.state, clipFocus: clip.id }, '', location.href); }, { capture: true });
        const media = clipMedia(clip); mediaCleanup.push(media.dispose);
        card.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') media.enter(); });
        card.addEventListener('pointerleave', media.leave);
        const caption = el('div', 'clip-caption');
        caption.append(el('span', 'technical', `${String(clips.indexOf(clip) + 1).padStart(2, '0')} / ${clip.categories.cameraMovement.join(' + ')}`), el('span', 'technical', clip.duration === null ? '— SEC' : `${clip.duration.toFixed(1)} SEC`), el('h2', '', clip.title), el('span', 'clip-arrow', '↗'), el('p', '', clip.description));
        card.append(media.root, caption); grid.append(card);
      }
      if (!visible.length) {
        const empty = el('div', 'clip-empty'); empty.append(el('h2', '', 'No matching studies.'), el('p', '', 'Try fewer filters or clear the selection to see the full collection.'), button('CLEAR FILTERS', reset)); grid.append(empty);
      }
    }
    function reset() { for (const group of groups) filters[group] = []; controls.forEach(input => { input.checked = false; }); update(); }
    const clear = button('CLEAR FILTERS', reset, 'technical');
    sidebar.append(el('h2', 'technical', 'REFINE THE FRAME'), el('p', 'clip-filter-help', 'Match any tag within a group, and every selected group.'), clear);
    for (const group of groups) {
      const field = el('fieldset'); field.append(el('legend', 'technical', groupLabels[group]));
      for (const tag of filterGroups[group]) {
        const label = el('label'); const input = el('input'); input.type = 'checkbox'; input.checked = filters[group].includes(tag);
        input.addEventListener('change', () => { filters[group] = input.checked ? [...filters[group], tag] : filters[group].filter(value => value !== tag); update(); });
        label.append(input, el('span', '', tag)); field.append(label); controls.push(input);
      } sidebar.append(field);
    }
    results.append(toolbar, grid); layout.append(sidebar, results); main.append(layout); update(false);
  }
  function detail(main: HTMLElement, clip: ClipReference) {
    document.title = `${clip.title} — Framefield Clips`;
    const back = localLink('/clips' + filterSearch(parseFilters(location.search)), '← ALL CLIPS', 'back-link');
    // A normal link for direct visits; in-app visits return to the exact prior entry.
    back.addEventListener('click', event => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !history.state?.clipInternal) return;
      event.preventDefault(); event.stopImmediatePropagation(); history.back();
    }, { capture: true });
    main.append(back);
    const media = clipMedia(clip, true); cleanup.push(media.dispose); main.append(media.root);
    main.append(pageTitle('MOTION STUDY / ' + clip.id.toUpperCase(), clip.title, clip.description));
    if (!clip.videoUrl) main.append(el('p', 'clip-collection-note', 'FOOTAGE PENDING — This is a schematic study brief, not a moving-image analysis. The prompt below describes intended motion. Parameters remain unavailable until footage is reviewed.'));
    const columns = el('div', 'clip-detail-columns');columns.dataset.ffNoTrail='';
    const parameters = el('section');
    const describe = (finding: Finding<string>) => finding.value === null ? 'Unavailable · footage required' : `${finding.value} · ${finding.status === 'inferred' ? 'inferred / unverified' : finding.status}${finding.status === 'inferred' ? ` · ${finding.confidenceState}` : ''}`;
    parameters.append(specTable([
      ['Camera movement', describe(clip.cameraMovement)], ['Shot size', describe(clip.framing)], ['Camera angle', describe(clip.cameraAngle)],
      ['Lens characteristics', describe(clip.lens)], ['Subject movement', describe(clip.subjectMotion)], ['Movement speed', describe(clip.movementSpeed)], ['Lighting', describe(clip.lighting)], ['Confidence', `${clip.confidence} — ${confidenceDefinitions[clip.confidence]}`],
    ], '01 / Camera parameters'));
    if (clip.controlIds.length) { const related = el('div', 'clip-related'); related.append(el('p', 'technical', 'EXPLORE RELATED CONTROLS')); for (const id of clip.controlIds) related.append(link(`/library/${id}`, `${id.toUpperCase()} ↗`, 'technical-action')); parameters.append(related); }
    const prompt = el('section', 'clip-prompt'); prompt.append(el('h2', 'technical', '02 / GENERATION PROMPT'), el('p', '', clip.prompt));
    const status = el('p', 'technical'); status.setAttribute('role', 'status');
    const copy = button('COPY PROMPT ↗', () => { void copyPrompt(); }, 'clip-copy technical');
    async function copyPrompt() {
      copy.disabled = true;
      try { await navigator.clipboard.writeText(clip.prompt); if (!copy.isConnected) return; copy.textContent = 'COPIED ✓'; status.textContent = 'Exact prompt copied to clipboard.'; }
      catch { if (!copy.isConnected) return; status.textContent = 'Clipboard unavailable. Select and copy the prompt above.'; }
      finally { copy.disabled = false; }
      clearTimeout(copyTimer); copyTimer = setTimeout(() => { copy.textContent = 'COPY PROMPT ↗'; status.textContent = ''; }, 2400);
    }
    prompt.append(copy, status, el('p', 'clip-prompt-note', 'Creative direction, not capture metadata. No focal length or physical production technique is verified by this brief.'));
    columns.append(parameters, prompt); main.append(columns);
    const evidence = el('section', 'clip-evidence');evidence.dataset.ffNoTrail=''; evidence.append(el('h2', 'technical', '03 / OBSERVATIONS & EVIDENCE'));
    evidence.append(el('h3', '', 'Observed visual characteristics'));
    for (const observation of clip.observations) evidence.append(el('p', '', `${observation.statement} (${observation.confidenceState}) — ${observation.evidence.join(' · ')}`));
    if (!clip.observations.length) evidence.append(el('p', '', 'No footage reviewed. No visual observations recorded.'));
    evidence.append(el('h3', '', 'Inferred production techniques'));
    for (const inference of clip.inferences) evidence.append(el('p', '', `${describe(inference)} — ${inference.evidence.join(' · ')} [${inference.evidenceObservationIds.join(', ')}]`));
    if (!clip.inferences.length) evidence.append(el('p', '', 'No production techniques inferred. Intended category tags are discovery labels only.'));
    for (const cue of clip.evidence) evidence.append(el('p', 'technical', `${cue.startSeconds}–${cue.endSeconds}s / ${cue.cue}`));
    if (clip.limitations?.length) { evidence.append(el('h3', '', 'Sampling limitations')); for (const limitation of clip.limitations) evidence.append(el('p', '', limitation)); }
    evidence.append(el('h3', '', 'Source & rights'), el('p', '', clip.source.title), el('p', '', clip.source.attribution), el('p', '', clip.license.name), el('p', '', clip.license.notes));
    if (clip.source.url) evidence.append(link(clip.source.url, clip.source.title, 'technical-action'));
    if (clip.license.url) evidence.append(link(clip.license.url, clip.license.name, 'technical-action'));
    main.append(evidence);
  }
  const popstate = () => render(true);
  const pagehide = (event: PageTransitionEvent) => { remember(); if (!event.persisted) dispose(); };
  function dispose() { disposeView(); window.removeEventListener('popstate', popstate); window.removeEventListener('pagehide', pagehide); history.scrollRestoration = oldScrollRestoration; }
  window.addEventListener('popstate', popstate); window.addEventListener('pagehide', pagehide);
  if (import.meta.hot) import.meta.hot.dispose(dispose);
  render();
}

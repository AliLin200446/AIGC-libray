/**
 * Framefield — Index page renderer (R1)
 * renderIndexPage(root, model) → dispose. Framework-free.
 * Filter state lives in the URL (?family=lens) so a filtered view can be shared.
 */
import type { IndexModel, ControlCard, FamilyId } from './index-model';
import { thumbSVG } from './control-thumbs';
import { pixelSVG } from '../pixel/pixel';

type Filter = 'all' | FamilyId;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const MODULE: Record<FamilyId, string> = {
  camera: 'ff-px--cross', lens: 'ff-px--ring', composition: 'ff-px--checker',
};

function card(c: ControlCard, href: string): string {
  const lensNum = c.thumb.kind === 'lens' ? `<span class="ix-pixnum" data-value="${c.thumb.focalMm}" aria-hidden="true"></span>` : '';
  return `
  <li>
    <a data-ff-no-trail class="ix-card" href="${esc(href)}">
      <div class="ix-thumb">${thumbSVG(c.thumb)}${lensNum}</div>
      <div class="ix-meta">
        <div class="ix-row"><span class="ix-id">${esc(c.id)}</span><span class="ix-go" aria-hidden="true">→</span></div>
        <span class="ix-title">${esc(c.title)}</span>
        <span class="ix-desc">${esc(c.behavior)}</span>
        <span class="ix-chips">
          <span class="ix-chip ix-chip--${c.status}">${esc(c.status)}</span>
          <span class="ix-chip ix-chip--${c.experiments}">${esc(c.experiments)}</span>
        </span>
      </div>
    </a>
  </li>`;
}

export function indexPageHTML(m: IndexModel): string {
  const count = (f: Filter) => (f === 'all' ? m.controls.length : m.controls.filter((c) => c.family === f).length);
  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...m.families.map((f) => ({ id: f.id as Filter, label: f.name })),
  ];
  return `
  <div class="ix">
    <section class="ix-intro" data-ff-no-trail>
      <div class="ix-intro-text">
        <span class="ix-lab">${esc(m.kicker)}</span>
        <h1 class="ix-h1">${esc(m.title)}</h1>
        <p class="ix-lede">${esc(m.lede)}</p>
      </div>
      <ol class="ix-steps">
        ${m.steps.map((s, i) => `<li><span class="ix-no">${String(i + 1).padStart(2, '0')}</span><b>${esc(s.title)}</b><span>${esc(s.body)}</span></li>`).join('')}
      </ol>
    </section>

    <div class="ix-filterbar" data-ff-no-trail>
      <div class="ix-filter" role="group" aria-label="Filter by family">
        ${filters.map((f) => `<button type="button" data-filter="${f.id}" aria-pressed="false">${
          f.id === 'all' ? '' : `<span class="ff-px ${MODULE[f.id as FamilyId]}" aria-hidden="true"></span>`}${esc(f.label)} <span class="ix-n">${count(f.id)}</span></button>`).join('')}
      </div>
      <span class="ix-lab ix-count" aria-live="polite"></span>
    </div>

    ${m.families.map((f) => {
      const items = m.controls.filter((c) => c.family === f.id);
      return `
      <section class="ix-family" data-family="${f.id}" aria-labelledby="ix-fam-${f.id}">
        <div class="ix-rail" data-ff-no-trail>
          <span class="ix-lab ix-rail-kicker"><span class="ff-px ${MODULE[f.id]}" aria-hidden="true"></span>${esc(f.no)} / Family</span>
          <h2 id="ix-fam-${f.id}">${esc(f.name)}</h2>
          <p>${esc(f.description)}</p>
          <span class="ix-lab">${items.length} controls</span>
        </div>
        <ul class="ix-grid">${items.map((c) => card(c, m.hrefFor(c))).join('')}</ul>
      </section>`;
    }).join('')}

    <section data-ff-no-trail class="ix-about" aria-label="About this build">
      <span class="ix-lab">About this build</span>
      <div>${m.about.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
    </section>
  </div>`;
}

export function renderIndexPage(root: HTMLElement, m: IndexModel): () => void {
  root.innerHTML = indexPageHTML(m);
  const ac = new AbortController();

  // pixel numerals on lens cards (values only — the pixel-type rule)
  root.querySelectorAll<HTMLElement>('.ix-pixnum').forEach((el) => {
    el.appendChild(pixelSVG(el.dataset.value ?? ''));
  });

  const valid = new Set<Filter>(['all', ...m.families.map((f) => f.id)]);
  const read = (): Filter => {
    const q = new URLSearchParams(location.search).get('family') as Filter | null;
    return q && valid.has(q) ? q : 'all';
  };
  const countEl = root.querySelector<HTMLElement>('.ix-count')!;

  const apply = (f: Filter, push: boolean) => {
    root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) =>
      b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    root.querySelectorAll<HTMLElement>('.ix-family').forEach((s) => {
      s.hidden = f !== 'all' && s.dataset.family !== f;
    });
    const shown = f === 'all' ? m.controls.length : m.controls.filter((c) => c.family === f).length;
    countEl.textContent = `Showing ${shown} of ${m.controls.length} · ${m.families.length} families`;
    if (push) {
      const u = new URL(location.href);
      if (f === 'all') u.searchParams.delete('family'); else u.searchParams.set('family', f);
      history.pushState(history.state, '', u);
    }
  };

  root.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((b) =>
    b.addEventListener('click', () => apply(b.dataset.filter as Filter, true), { signal: ac.signal }));
  window.addEventListener('popstate', () => apply(read(), false), { signal: ac.signal });
  apply(read(), false);

  return () => ac.abort();
}

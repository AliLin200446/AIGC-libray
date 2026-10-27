import { el, link } from './dom';
import './library.css';
import './archive.css';

/** Shared public catalog shell; the spatial homepage owns its own shell. */
export function archiveShell(app: HTMLElement) {
  document.body.classList.add('library-app', 'archive-page');
  app.replaceChildren();
  const header = el('header', 'archive-header');
  const nav = el('nav'); nav.setAttribute('aria-label', 'Main navigation');
  for (const [href, label] of [['/', 'Instrument'], ['/index', 'Index'], ['/clips', 'Clips'], ['/recipes', 'Recipes']]) {
    const item = link(href!, label!);
    if (location.pathname === href) item.setAttribute('aria-current', 'page');
    nav.append(item);
  }
  header.append(link('/', 'FRAMEFIELD', 'wordmark'), el('span', 'archive-edition', 'VISUAL CONTROL LIBRARY / VOL. 01'), nav);
  app.append(header);
}
export function archiveFooter() {
  const footer = el('footer', 'archive-footer'); footer.dataset.ffNoTrail='';
  const identity = el('div'); identity.append(el('strong', '', 'FRAMEFIELD'), el('p', '', 'Visual Control Library for Generative Media'));
  footer.append(identity, el('span', 'technical', 'ARCHIVE / VOL. 01'), link('https://alilinlab.com', 'ALI LIN ↗'), link('/index', 'INDEX ↗'));
  return footer;
}
export function pageTitle(index: string, title: string, description: string) {
  const header = el('header', 'archive-title'); header.dataset.ffNoTrail='';
  header.append(el('p', 'technical', index), el('h1', '', title), el('p', 'archive-description', description));
  return header;
}
export function specTable(rows: readonly (readonly [string, string])[], label = 'Specification') {
  const table = el('table', 'spec-table');
  const caption = el('caption', 'technical', label); table.append(caption);
  const body = el('tbody');
  for (const [name, value] of rows) {
    const row = el('tr'); const key = el('th', '', name); key.scope = 'row';
    const cell = el('td');
    if ((name === 'Status' && value === 'canonical') || (name === 'Experiments' && value === 'untested')) cell.append(el('span', name === 'Status' ? 'ff-badge' : 'ff-badge ff-badge--outline', value));
    else cell.textContent = value;
    row.append(key, cell); body.append(row);
  }
  table.append(body); return table;
}
export function renderUnavailable(app: HTMLElement, message: string) {
  archiveShell(app); document.title = `${message} — Framefield`;
  const main = el('main', 'archive-recovery');
  main.append(pageTitle('ARCHIVE / UNAVAILABLE', message, 'Return to the instrument or browse the component index.'), link('/index', 'BROWSE COMPONENTS ↗', 'technical-action'));
  app.append(main, archiveFooter());
}

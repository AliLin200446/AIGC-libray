import { controls } from '../controls';
import { el, link } from './dom';
import { archiveShell, archiveFooter, pageTitle } from './archive';
import { motionDiagram, overlayLayer } from './components/preview';

const families = [
  { id: 'camera', title: 'Camera movement', description: 'Change the viewpoint through camera rotation or physical translation.' },
  { id: 'lens', title: 'Lens', description: 'Explore focal length, field of view and the relationship between viewpoint and framing.' },
  { id: 'composition', title: 'Composition', description: 'Organize the subject, visual anchors and spatial balance within the frame.' },
] as const;
export function renderCatalog(app: HTMLElement) {
  archiveShell(app); document.title = 'Components — Framefield';
  const main = el('main'); main.append(pageTitle('INDEX / 12 CANONICAL CONTROLS', 'Components', 'A catalog of camera, lens and composition controls. Inspect the behavior. Configure the intent.'));
  const toolbar = el('div', 'catalog-toolbar technical'); const nav = el('nav'); nav.setAttribute('aria-label', 'Control families');
  families.forEach(f => nav.append(link(`#${f.id}`, f.title))); toolbar.append(nav, el('span', '', '03 FAMILIES / 12 COMPONENTS')); main.append(toolbar);
  families.forEach((family, i) => {
    const section = el('section', 'catalog-family'); section.id = family.id;
    const label = el('div', 'catalog-family-heading'); const items = controls.filter(c => c.category === family.id);
    label.append(el('p', 'technical', `${String(i+1).padStart(2,'0')} / FAMILY`), el('h2', '', family.title), el('p', '', family.description), el('p', 'technical', `${String(items.length).padStart(2,'0')} CONTROLS`));
    const grid = el('div', 'component-grid');
    for (const control of items) {
      const module = el('article', 'component-module');module.dataset.ffNoTrail=''; const target = link(`/library/${control.id}`, '');
      const field = el('div', 'component-field'); field.setAttribute('aria-hidden', 'true');
      field.append(el('span', 'technical', `CONTROL ${String(controls.indexOf(control)+1).padStart(2,'0')} / SCHEMATIC`));
      if (control.category === 'camera') field.append(motionDiagram(control));
      else if (control.category === 'lens') field.append(el('span', 'study-mark', control.name));
      else field.append(overlayLayer(control.visualPreview.overlays));
      const caption = el('div', 'component-caption'); caption.append(el('h3', '', control.name), el('span', 'technical', `${control.category} / CANONICAL`), el('span', 'technical component-view', 'VIEW ↗'));
      target.append(field, caption); module.append(target); grid.append(module);
    }
    section.append(label, grid); main.append(section);
  }); app.append(main, archiveFooter());
}

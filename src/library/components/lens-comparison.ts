import { controls } from '../../controls';
import { lensComparison } from '../../visuals/previews';
import { el, link, button } from '../dom';
import { visualPreview } from './preview';

export function lensComparisonPanel(initialId = 'lens-50mm'): HTMLElement {
  const panel = el('div', 'lens-comparison');
  const lenses = lensComparison.controlIds.map(id => controls.find(control => control.id === id)).filter(control => control !== undefined);
  let selected = lenses.find(control => control.id === initialId) ?? lenses[0];
  if (!selected) return panel;
  const toolbar = el('div', 'lens-toolbar');
  const selector = el('div', 'lens-selector'); selector.setAttribute('role', 'group'); selector.setAttribute('aria-label', 'Compare focal lengths');
  const viewport = el('div', 'lens-viewport');
  const caption = el('div', 'lens-caption'); caption.setAttribute('aria-live', 'polite');
  const buttons = new Map<string, HTMLButtonElement>();
  function update() {
    if (!selected) return;
    viewport.replaceChildren(visualPreview(selected).element);
    buttons.forEach((item, id) => item.setAttribute('aria-pressed', String(id === selected?.id)));
    caption.replaceChildren(el('p', '', selected.shortDescription), link(`/library/${selected.id}`, `Explore ${selected.name} ↗`, 'explore-link'));
  }
  for (const lens of lenses) {
    const item = button(lens.name, () => { selected = lens; update(); });
    buttons.set(lens.id, item); selector.append(item);
  }
  toolbar.append(el('p', 'eyebrow', 'MATCHED FRAMING / FULL FRAME'), selector);
  panel.append(toolbar, viewport, caption);
  update(); return panel;
}

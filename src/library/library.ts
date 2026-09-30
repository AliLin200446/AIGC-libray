import { controls } from '../controls';
import type { ControlSpecification } from '../controls/types';
import { el, link, heading } from './dom';
import { visualPreview } from './components/preview';
import { lensComparisonPanel } from './components/lens-comparison';
import { configurationPanel, configuredOverlays } from './components/configure';
import { modelComparison, interpretation } from './components/model-evidence';
import { defaultConfiguration } from './state';
import './library.css';

function shell(app: HTMLElement): void {
  document.body.classList.add('library-app');
  app.replaceChildren();
  const header = el('header', 'library-header');
  header.append(link('/', 'FRAMEFIELD', 'wordmark'), el('span', 'edition', 'A VISUAL VOCABULARY / VOL. 01'));
  app.append(header);
}
function footer(): HTMLElement {
  const node = el('footer', 'library-footer');
  node.append(el('span', '', 'Creative intent → Visual control → Model translation'), el('span', '', '12 controls / Studies in progress'));
  if (import.meta.env.DEV) node.append(link('/dev/controls', 'Research specifications ↗'));
  return node;
}
function detail(app: HTMLElement, control: ControlSpecification): void {
  document.title = `${control.name} — Framefield`;
  app.append(link(`/#${control.category}`, `← ${control.category.toUpperCase()} / ALL CONTROLS`, 'back-link'));
  const title = el('div', 'detail-title');
  title.append(el('div', 'eyebrow', `01 / VISUAL · ${control.category.toUpperCase()}`), el('h1', '', control.name), el('p', '', control.shortDescription));
  app.append(title);
  const preview = visualPreview(control);
  preview.element.classList.add('detail-preview');
  if (import.meta.env.DEV || control.visualPreview.asset) app.append(preview.element);
  else app.append(link(`/#${control.category}`, 'Explore the deterministic demonstration ↗', 'back-link'));
  const behavior = el('section', 'detail-section behavior');
  behavior.append(heading('02 / UNDERSTAND', 'What changes'));
  const observations = el('div', 'behavior-copy'); control.observableBehavior.forEach(text => observations.append(el('p', '', text)));
  behavior.append(observations); app.append(behavior);
  if (control.category === 'lens' && (import.meta.env.DEV || control.visualPreview.asset)) {
    const compare = el('section', 'detail-section'); compare.append(heading('LENS STUDY', 'See the relationship'), lensComparisonPanel(control.id)); app.append(compare);
  }
  const configuration = defaultConfiguration(control);
  const modelInterpretation = interpretation(control, configuration);
  const configure = el('section', 'detail-section');
  configure.append(heading('03 / CONFIGURE', 'Make the decision.'));
  configure.append(el('p', 'section-note', 'Set the intended behavior. These values stay local and do not generate media. Composition guides respond when a preview is available.'));
  const notice = el('p', 'configuration-notice', 'Default configuration · no generation requested'); notice.setAttribute('aria-live', 'polite');
  configure.append(configurationPanel(control, configuration, () => {
    preview.setOverlays(configuredOverlays(control, configuration)); modelInterpretation.update();
    notice.textContent = 'Configuration updated locally · no generation requested';
  }), notice); app.append(configure);
  if (import.meta.env.DEV) {
  const compare = el('section', 'detail-section');
  compare.append(heading('04 / COMPARE', 'One intent. Different interpretations.'), el('p', 'section-note', 'Model studies will appear here as evidence becomes available.'), modelComparison(control)); app.append(compare);
  const observed = el('section', 'detail-section');
  observed.append(heading('05 / EVALUATE', 'What the evidence says'), modelInterpretation.observed); app.append(observed);
  const translated = el('section', 'detail-section');
  translated.append(heading('06 / TRANSLATE', 'Intent becomes instruction.'), modelInterpretation.translation); app.append(translated);
  } else {
    const research = el('section', 'detail-section');
    research.append(heading('04 / RESEARCH', 'From intent to model translation'), el('p', '', control.creativeIntent), el('p', 'section-note', 'Model-specific translations and comparative evidence are still under study. No model performance claims are published in this release.'));
    app.append(research);
  }
  app.append(footer());
}
export function renderLibrary(app: HTMLElement): void {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/library') {
    void import('./instrument/home').then(({ renderInstrument }) => renderInstrument(app));
    return;
  }
  shell(app);
  const id = path.slice('/library/'.length);
  const control = controls.find(item => item.id === id);
  if (control) detail(app, control);
  else { document.title = 'Control not found — Framefield'; app.append(el('h1', '', 'Control not found.'), link('/', 'Return to Framefield')); }
}

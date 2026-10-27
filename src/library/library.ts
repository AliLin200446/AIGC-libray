import { realWorldReferences } from './components/real-world-reference';
import { controls } from '../controls';
import { el, link, heading, button } from './dom';
import { overlayLayer, visualPreview } from './components/preview';
import { lensComparisonPanel } from './components/lens-comparison';
import { configurationPanel, configuredOverlays } from './components/configure';
import { modelComparison, interpretation } from './components/model-evidence';
import { defaultConfiguration } from './state';
import { createDemonstration } from './instrument/scene';
import { archiveShell, archiveFooter, pageTitle, specTable, renderUnavailable } from './archive';

function detail(app: HTMLElement, control: (typeof controls)[number]): void {
  document.title = `${control.name} — Framefield`;
  const main = el('main', 'control-document');
  main.append(link(`/index#${control.category}`, `← INDEX / ${control.category.toUpperCase()}`, 'back-link'));
  main.append(pageTitle(`CONTROL ${String(controls.findIndex(item=>item.id===control.id)+1).padStart(2,'0')} / ${control.category.toUpperCase()}`, control.name, control.shortDescription));
  const hero = el('section', 'control-hero');
  const figure = el('figure', 'control-demonstration');
  const stage = el('div', 'control-stage');
  let guides = overlayLayer(control.visualPreview.overlays); stage.append(guides);
  const caption = el('figcaption'); const studyLabel=el('span','technical'); studyLabel.append(el('span','ff-section-no','01'),document.createTextNode(' / DETERMINISTIC STUDY · NOT MODEL OUTPUT')); caption.append(studyLabel);
  figure.append(stage, caption);
  const specification = el('aside', 'control-spec');specification.dataset.ffNoTrail='';
  specification.append(specTable([
    ['Family', control.category], ['Control ID', control.id], ['Revision', String(control.revision)], ['Status', control.status],
    ['Media', control.media.join(' / ')], ['Parameters', control.parameters.map(p=>p.name).join(' · ')],
    ['Experiments', control.experimentStatus],
  ]), el('p','',control.creativeIntent), link(`/#${control.category}`, 'EXPLORE IN INSTRUMENT ↗','technical-action'));
  hero.append(figure, specification); main.append(hero); app.append(main);
  let scene: ReturnType<typeof createDemonstration> | undefined;
  try {
    scene=createDemonstration(stage,()=>{},()=>{}); scene.activate(control.id);
    let paused=false;const actions=el('div');
    const pause=button('PAUSE',()=>{paused=!paused;scene!.setPaused(paused);pause.textContent=paused?'RESUME':'PAUSE';pause.setAttribute('aria-pressed',String(paused));});pause.setAttribute('aria-pressed','false');
    actions.append(button('REPLAY ↗',()=>{scene!.setPaused(false);paused=false;pause.textContent='PAUSE';pause.setAttribute('aria-pressed','false');scene!.activate(control.id);}),pause);caption.append(actions);
    window.addEventListener('pagehide',event=>{if(event.persisted)scene?.setPaused(true);else scene?.dispose();});
    window.addEventListener('pageshow',event=>{if(event.persisted)scene?.setPaused(paused);});
  } catch { stage.replaceChildren(el('p','technical','3D study unavailable on this device. Use the specification below.')); }
  const behavior = el('section', 'detail-section behavior');
  behavior.append(heading('02 / OBSERVABLE BEHAVIOR', 'What changes'));
  const observations = el('div', 'behavior-copy'); control.observableBehavior.forEach(text => observations.append(el('p', '', text)));
  behavior.append(observations); main.append(behavior);
  if (control.category === 'lens' && (import.meta.env.DEV || control.visualPreview.asset)) {
    const compare = el('section', 'detail-section'); compare.append(heading('LENS STUDY', 'Spatial relationships'), lensComparisonPanel(control.id)); main.append(compare);
  }
  if(control.visualPreview.asset){const evidence=el('section','detail-section');evidence.append(heading('MEDIA / CONTROL STUDY','Recorded study'),visualPreview(control).element);main.append(evidence);}
  const practice=realWorldReferences(control.id);if(practice)main.append(practice);
  const configuration = defaultConfiguration(control);
  const modelInterpretation = interpretation(control, configuration);
  const configure = el('section', 'detail-section');
  configure.append(heading('03 / PARAMETERS', 'Configuration'));
  configure.append(el('p', 'section-note', 'Set the intended behavior. Values stay local; they do not generate media. The study above shows the canonical demonstration; composition guides reflect your configuration.'));
  const notice = el('p', 'configuration-notice', 'Default configuration · no generation requested'); notice.setAttribute('aria-live', 'polite');
  configure.append(configurationPanel(control, configuration, () => {
    const next=overlayLayer(configuredOverlays(control, configuration));guides.replaceWith(next);guides=next;modelInterpretation.update();
    notice.textContent = 'Configuration updated locally · no generation requested';
  }), notice); main.append(configure);
  const failures=el('section','detail-section');failures.append(heading('04 / TEST CRITERIA','Failure modes to inspect'),el('p','section-note','Anticipated failure modes in the control specification. These are inspection criteria, not measured model results.'));
  const list=el('ol','technical-list ff-failure-list');control.knownFailureModes.forEach(f=>list.append(el('li','',f.description)));failures.append(list);main.append(failures);
  if (import.meta.env.DEV) {
    const compare = el('section', 'detail-section');
    compare.append(heading('05 / MODEL RESPONSE', 'Generative behavior'), el('p', 'section-note', 'Model studies will appear here as evidence becomes available.'), modelComparison(control)); main.append(compare);
    const observed = el('section', 'detail-section'); observed.append(heading('06 / OBSERVED', 'Evidence assessment'), modelInterpretation.observed); main.append(observed);
    const translated = el('section', 'detail-section'); translated.append(heading('07 / MODEL EXPORT', 'Model translation'), modelInterpretation.translation); main.append(translated);
  } else {
    const research = el('section', 'detail-section'); research.append(heading('05 / MODEL RESPONSE', 'Generative behavior'), el('p', '', control.creativeIntent), el('p', 'section-note', 'Model-specific translations and comparative evidence are still under study. No model performance claims are published in this release.')); main.append(research);
  }
  app.append(archiveFooter());
}
export function renderLibrary(app: HTMLElement): void {
  const path = window.location.pathname.replace(/\/$/, '');
  if (path === '/library') { void import('./instrument/home').then(({ renderInstrument }) => renderInstrument(app)); return; }
  const control = controls.find(item => item.id === path.slice('/library/'.length));
  if (control) { archiveShell(app);detail(app, control); }
  else renderUnavailable(app,'Control not found');
}

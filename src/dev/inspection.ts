import { controls } from '../controls';
import type { ControlParameter, ControlSpecification } from '../controls/types';
import { evaluationDimensions, statusGuidance } from '../evaluation/types';
import { experiments, experimentRuns } from '../experiments/data';
import { modelSlots, modelTranslations } from '../translations/data';
import './inspection.css';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function list(items: readonly string[]): HTMLUListElement {
  const ul = element('ul');
  items.forEach(item => ul.append(element('li', item)));
  return ul;
}

function section(parent: HTMLElement, title: string, content: string | readonly string[]): void {
  const block = element('div');
  block.className = 'field';
  block.append(element('h3', title), typeof content === 'string' ? element('p', content) : list(content));
  parent.append(block);
}

function describeParameter(parameter: ControlParameter): string {
  const values = parameter.kind === 'choice'
    ? `Options: ${parameter.options.join(', ')}.`
    : parameter.kind === 'number'
      ? `Range: ${parameter.min}–${parameter.max} ${parameter.unit}.`
      : 'Values: true / false.';
  return `${parameter.name} (${parameter.id}) — ${parameter.description} ${values} Default: ${parameter.defaultValue}.`;
}

function renderControl(control: ControlSpecification): HTMLElement {
  const article = element('article');
  article.id = control.id;
  article.append(element('h2', control.name));
  section(article, 'Specification', `${control.id} · revision ${control.revision} · ${control.category} · ${control.media.join(' / ')} · experiments: ${control.experimentStatus}`);
  section(article, 'Description', control.shortDescription);
  section(article, 'Creative intent', control.creativeIntent);
  section(article, 'Observable behavior', control.observableBehavior);
  section(article, 'Test conditions', control.testConditions);
  section(article, 'Parameters', control.parameters.map(describeParameter));
  section(article, 'Invariants', control.invariants);
  section(article, 'Evaluation criteria', control.evaluationCriteria.map(item => `${item.id} — ${item.description}`));
  section(article, 'Known failure modes to test', control.knownFailureModes.map(item => `${item.id} — ${item.description}`));

  const translations = element('div');
  translations.className = 'field';
  translations.append(element('h3', 'Model translations'));
  const entries = element('div');
  for (const translation of modelTranslations.filter(item => item.controlId === control.id)) {
    const slot = modelSlots.find(item => item.id === translation.modelSlotId);
    const details = element('details');
    details.append(element('summary', `${slot?.label ?? translation.modelSlotId} — ${translation.reliability.status} · ${translation.status}`));
    details.append(element('p', `Model: ${slot?.model ? `${slot.model.provider} / ${slot.model.name} / ${slot.model.version}` : 'Not selected'}`));
    details.append(element('p', `Instruction: ${translation.instruction ?? 'Not drafted'}`));
    const pre = element('pre', JSON.stringify(translation, null, 2));
    details.append(pre);
    entries.append(details);
  }
  translations.append(entries);
  article.append(translations);

  const attachedExperiments = experiments.filter(experiment => experiment.controlId === control.id);
  const attachedRuns = experimentRuns.filter(run => attachedExperiments.some(experiment => experiment.id === run.experimentId));
  section(article, 'Experiment evidence', `${attachedExperiments.length} experiments · ${attachedRuns.length} runs. ${attachedExperiments.length === 0 ? 'No results recorded.' : 'See records below.'}`);
  if (attachedExperiments.length > 0) {
    article.append(element('pre', JSON.stringify({ experiments: attachedExperiments, runs: attachedRuns }, null, 2)));
  }
  const raw = element('details');
  raw.append(element('summary', 'Canonical specification JSON'), element('pre', JSON.stringify(control, null, 2)));
  article.append(raw);
  return article;
}

export function renderInspection(app: HTMLElement): void {
  app.replaceChildren();
  app.append(element('p', 'DEVELOPMENT / SPECIFICATION INSPECTION'), element('h1', 'Visual Control Library'));
  app.append(element('p', 'Visual Control Library translates creative intent into model-specific generative controls.'));
  app.append(element('p', 'Creative Intent → Visual Control → Model Translation → Generation → Evaluation → Feedback'));
  app.append(element('p', '12 controls · 3 unassigned model slots · no generation APIs connected'));

  const nav = element('nav');
  nav.setAttribute('aria-label', 'Control index');
  for (const category of ['camera', 'lens', 'composition'] as const) {
    const row = element('p');
    row.append(element('strong', `${category.toUpperCase()}  `));
    for (const control of controls.filter(item => item.category === category)) {
      const link = element('a', control.name);
      link.href = `#${control.id}`;
      row.append(link, document.createTextNode('  '));
    }
    nav.append(row);
  }
  app.append(nav);
  const evaluation = element('section');
  evaluation.setAttribute('aria-labelledby', 'evaluation-title');
  const title = element('h2', 'Shared evaluation model');
  title.id = 'evaluation-title';
  evaluation.append(title);
  evaluation.append(list(Object.values(evaluationDimensions).map(dimension => `${dimension.label} — ${dimension.question}`)));
  evaluation.append(element('p', 'All statuses describe success. Strong under Collateral Change means unrelated aspects were preserved. Consistency requires repeated comparable runs; a single run cannot establish it.'));
  evaluation.append(list(Object.entries(statusGuidance).map(([status, guidance]) => `${status} — ${guidance}`)));
  evaluation.append(element('p', 'Parameter ranges are editable test targets, not verified model capabilities. Failure modes are hypotheses to test, not observed model failures.'));
  app.append(evaluation);
  controls.forEach(control => app.append(renderControl(control)));
}

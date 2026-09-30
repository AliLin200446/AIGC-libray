import type { ControlSpecification } from '../../controls/types';
import { modelSlots, modelTranslations } from '../../translations/data';
import { experiments } from '../../experiments/data';
import { evaluationDimensions, untestedEvaluation } from '../../evaluation/types';
import { el } from '../dom';
import { visualPreview } from './preview';
import type { ControlConfiguration } from '../state';

export function modelComparison(control: ControlSpecification): HTMLElement {
  const row = el('div', 'model-comparison');
  for (const slot of modelSlots) {
    const translation = modelTranslations.find(item => item.controlId === control.id && item.modelSlotId === slot.id);
    const section = el('section', 'model-study');
    section.append(el('h3', '', slot.label));
    const evidence = translation?.visualEvidence ?? [];
    const assets = evidence.length ? evidence : [null];
    for (const asset of assets) {
      section.append(visualPreview(control, { compact: true, spec: { ...control.visualPreview, asset, overlays: [], title: 'Untested / experiment pending', requiredAsset: ['Same control configuration', 'Comparable input & settings', 'Repeated paired generations'] } }).element);
    }
    section.append(el('p', 'model-identity', slot.model ? `${slot.model.provider} / ${slot.model.name} / ${slot.model.version}` : 'Model not selected'));
    row.append(section);
  }
  return row;
}

export function interpretation(control: ControlSpecification, state: ControlConfiguration): { observed: HTMLElement; translation: HTMLElement; update: () => void } {
  const observed = el('div', 'observations');
  const translation = el('div', 'translation-flow');
  const selector = el('select', 'model-selector'); selector.setAttribute('aria-label', 'Selected model');
  modelSlots.forEach(slot => { const option = el('option', '', slot.label); option.value = slot.id; selector.append(option); });
  const assessments = el('div', 'assessments');
  const notes = el('div', 'behavior-notes');
  const modelLabel = el('label', 'eyebrow', 'SELECT A MODEL');
  selector.id = 'selected-model'; modelLabel.htmlFor = selector.id;
  observed.append(modelLabel, selector, assessments, notes);
  const intent = el('div', 'translation-step'); intent.append(el('h3', 'eyebrow', 'CANONICAL INTENT'), el('p', '', control.creativeIntent));
  const selectedModel = el('div', 'translation-step');
  const instruction = el('div', 'translation-step');
  const config = el('details', 'configuration-record');
  config.append(el('summary', '', 'Current configuration · translation input'));
  const code = el('pre'); config.append(code);
  translation.append(intent, el('span', 'flow-arrow', '↓'), selectedModel, el('span', 'flow-arrow', '↓'), instruction, config);
  function update() {
    const slot = modelSlots.find(item => item.id === selector.value);
    const record = modelTranslations.find(item => item.controlId === control.id && item.modelSlotId === selector.value);
    // Only attach observations from a matching configuration; editing values cannot create evidence.
    const experiment = experiments.find(item => item.controlId === control.id && item.translationId === record?.id && item.controlRevision === control.revision && item.translationRevision === record?.revision && Object.entries(state.parameters).every(([key, value]) => item.parameterValues[key] === value));
    const evaluation = experiment?.evaluation ?? untestedEvaluation();
    assessments.replaceChildren();
    for (const [key, dimension] of Object.entries(evaluationDimensions)) {
      const assessment = evaluation[key as keyof typeof evaluationDimensions];
      const block = el('div'); block.append(el('h3', '', dimension.label), el('span', 'evidence-rating', assessment.status), el('p', '', assessment.notes.join(' ') || 'No assessed runs for this configuration.')); assessments.append(block);
    }
    notes.replaceChildren();
    for (const [title, entries] of [['Known behaviors', record?.observedBehavior ?? []], ['Known failures', record?.knownFailures ?? []]] as const) {
      const block = el('div'); block.append(el('h3', '', title), el('p', '', entries.length ? entries.join(' ') : 'Untested. No observations recorded.')); notes.append(block);
    }
    notes.append(el('p', 'field-description', 'Strong under Collateral Change means unrelated aspects were preserved. Model observations may cover other configurations; ratings above require a matching experiment.'));
    selectedModel.replaceChildren(el('h3', 'eyebrow', 'SELECTED MODEL'), el('p', '', `${slot?.label ?? 'No model'} · ${slot?.model?.name ?? 'Not assigned'}`));
    instruction.replaceChildren(el('h3', 'eyebrow', 'MODEL-SPECIFIC INSTRUCTION'), el('p', '', record?.instruction ?? 'Translation pending. Select a real model and test its interpretation before drawing conclusions.'));
    code.textContent = JSON.stringify(state, null, 2);
  }
  selector.addEventListener('change', update); update();
  return { observed, translation, update };
}

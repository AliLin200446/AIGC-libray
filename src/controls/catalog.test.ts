import assert from 'node:assert/strict';
import test from 'node:test';
import { controls } from './index';
import { modelSlots, modelTranslations } from '../translations/data';
import { experiments, experimentRuns } from '../experiments/data';
import { untestedEvaluation } from '../evaluation/types';
import { defaultConfiguration, setParameter } from '../library/state';
import { lensComparison } from '../visuals/previews';

const unique = (ids: readonly string[]) => assert.equal(new Set(ids).size, ids.length);

test('catalog has the twelve requested controls and meaningful testable specifications', () => {
  assert.deepEqual(controls.map(control => control.id).sort(), ['pan', 'tilt', 'dolly', 'orbit', 'lens-24mm', 'lens-35mm', 'lens-50mm', 'lens-85mm', 'centered', 'symmetrical', 'rule-of-thirds', 'negative-space'].sort());
  unique(controls.map(control => control.id));
  unique(controls.flatMap(control => [...control.evaluationCriteria, ...control.knownFailureModes].map(item => item.id)));
  for (const category of ['camera', 'lens', 'composition']) assert.equal(controls.filter(control => control.category === category).length, 4);
  for (const control of controls) {
    assert(control.creativeIntent && control.observableBehavior.length && control.testConditions.length);
    assert(control.invariants.length && control.evaluationCriteria.length && control.knownFailureModes.length);
    unique(control.parameters.map(parameter => parameter.id));
    for (const parameter of control.parameters) {
      if (parameter.kind === 'choice') assert(parameter.options.includes(parameter.defaultValue));
      if (parameter.kind === 'number') assert(parameter.min <= parameter.defaultValue && parameter.defaultValue <= parameter.max);
    }
  }
});

test('every control has exactly one empty translation per model slot with valid revision references', () => {
  unique(modelSlots.map(slot => slot.id));
  unique(modelTranslations.map(translation => translation.id));
  assert.equal(modelTranslations.length, 36);
  for (const control of controls) {
    for (const slot of modelSlots) {
      const matches = modelTranslations.filter(translation => translation.controlId === control.id && translation.modelSlotId === slot.id);
      assert.equal(matches.length, 1);
      assert.equal(matches[0]?.controlRevision, control.revision);
    }
  }
  for (const translation of modelTranslations) {
    assert.equal(translation.instruction, null);
    assert.equal(translation.status, 'unconfigured');
    assert.equal(translation.reliability.status, 'untested');
    assert.deepEqual(translation.reliability.evidenceRunIds, []);
    assert.deepEqual(translation.observedBehavior, []);
    assert.deepEqual(translation.visualEvidence, []);
    assert.deepEqual(translation.knownFailures, []);
    assert.deepEqual(translation.experimentNotes, []);
  }
  assert(modelSlots.every(slot => slot.model === null));
  assert(controls.every(control => control.experimentStatus === 'untested'));
  assert.deepEqual(experiments, []);
  assert.deepEqual(experimentRuns, []);
});

test('visual slots remain explicit placeholders and comparisons reference the shared catalog', () => {
  for (const control of controls) {
    assert.equal(control.visualPreview.asset, null);
    assert(control.visualPreview.requiredAsset.length > 0);
    if (control.category === 'camera') assert.equal(control.visualPreview.type, 'video');
    if (control.category === 'composition') assert(control.visualPreview.overlays.length > 0);
  }
  unique(lensComparison.controlIds);
  assert.equal(lensComparison.controlIds.length, 4);
  for (const id of lensComparison.controlIds) {
    const control = controls.find(item => item.id === id);
    assert.equal(control?.category, 'lens');
    assert.equal(control?.visualPreview.comparisonGroupId, lensComparison.id);
  }
});

test('local parameter edits validate values without mutating canonical definitions or other sessions', () => {
  const control = controls.find(item => item.id === 'dolly');
  assert(control);
  const first = defaultConfiguration(control);
  const second = defaultConfiguration(control);
  setParameter(control, first, 'direction', 'out');
  setParameter(control, first, 'distance', 4);
  setParameter(control, first, 'subject-lock', false);
  assert.equal(second.parameters.direction, 'in');
  assert.equal(defaultConfiguration(control).parameters.distance, 2);
  assert.throws(() => setParameter(control, first, 'distance', 999));
  assert.throws(() => setParameter(control, first, 'distance', Number.NaN));
  assert.throws(() => setParameter(control, first, 'direction', 'sideways'));
  assert.throws(() => setParameter(control, first, 'subject-lock', 'true'));
  assert.equal(first.parameters.distance, 4);
});

test('fresh evaluation dimensions and experiments never share mutable evidence arrays', () => {
  const first = untestedEvaluation();
  const second = untestedEvaluation();
  first.intentFidelity.evidenceRunIds.push('test-run');
  first.intentFidelity.notes.push('Test-only observation');
  assert.deepEqual(first.consistency.evidenceRunIds, []);
  assert.deepEqual(first.collateralChange.notes, []);
  assert.deepEqual(second.intentFidelity.evidenceRunIds, []);
  assert.deepEqual(second.intentFidelity.notes, []);
});

test('control template retains registry values and produces honest evidence state', async () => {
  const {toControlModels,controlComposeHref}=await import('./control-adapter');
  const {defaults}=await import('./control-model');
  const {pageModelFor,controlPageHTML}=await import('./control-page');
  const {readControlMapping}=await import('../playground/control-handoff');
  const list=toControlModels();
  for(const [i,c] of list.entries()){
    assert.equal(c.definition,controls[i]!.shortDescription);
    assert.deepEqual(c.params.map(p=>p.default),controls[i]!.parameters.map(p=>p.defaultValue));
    const model=pageModelFor(list,c.slug,{indexHref:'/index',experimentNeeds:[],composeHref:controlComposeHref})!;
    const html=controlPageHTML(model,defaults(c));
    assert(html.includes('No model has been run'));
    assert(!html.includes('Model A'));
    assert(readControlMapping(new URL(controlComposeHref(c,defaults(c)),'http://localhost').search));
  }
  assert.equal(pageModelFor(list,list[11]!.slug,{indexHref:'/index',experimentNeeds:[],composeHref:controlComposeHref})!.next!.href,'/library/pan');
});
test('control handoff validates parameters and does not invent unsupported motion',async()=>{
 const {readControlMapping}=await import('../playground/control-handoff');
 assert.equal(readControlMapping('?control=tilt&param-duration=8')!.controls.duration,8);
 assert.equal(readControlMapping('?control=tilt')!.controls.movement,'static');
 assert.equal(readControlMapping('?control=lens-85mm')!.controls.focalLength,85);
 assert.equal(readControlMapping('?control=dolly&param-distance=1.5')!.controls.distance,1.5);
 assert.equal(readControlMapping('?control=unknown'),null);
 assert.equal(readControlMapping('?control=tilt&param-duration=999')!.controls.duration,5);
});

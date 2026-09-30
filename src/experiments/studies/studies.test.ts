import test from 'node:test';
import assert from 'node:assert/strict';
import { controls } from '../../controls';
import { baseline } from './baseline';
import { studyManifest } from './manifest';
import { studyAssetName } from './naming';

test('all twelve study plans join canonical controls and baseline without contradictory locks', () => {
  assert.equal(studyManifest.length, 12);
  assert.equal(new Set(studyManifest.map(study => study.studyId)).size, 12);
  assert.deepEqual(studyManifest.map(study => study.controlId).sort(), controls.map(control => control.id).sort());
  for (const study of studyManifest) {
    const control = controls.find(item => item.id === study.controlId);
    assert(control);
    assert.equal(study.controlRevision, control.revision);
    assert.equal(study.baselineId, baseline.baselineId);
    assert.equal(study.status, 'specified');
    const changed = [...study.variableChanged, ...study.necessaryDependencies.map(item => item.variable)];
    assert(study.variablesLocked.every(variable => !changed.includes(variable)));
    assert.equal(new Set([...study.variablesLocked, ...changed]).size, Object.keys(baseline.locks).length);
    assert.equal(study.generationHandoff.canonicalIntent, control.creativeIntent);
    assert.deepEqual(study.production.overlays, control.visualPreview.overlays);
    for (const parameter of control.parameters) {
      const value = study.parameterValues[parameter.id];
      if (parameter.kind === 'choice') assert(typeof value === 'string' && parameter.options.includes(value));
      if (parameter.kind === 'boolean') assert.equal(typeof value, 'boolean');
      if (parameter.kind === 'number') assert(typeof value === 'number' && value >= parameter.min && value <= parameter.max);
    }
  }
  assert.deepEqual(baseline.referenceAssets, []);
});

test('motion plans have six-second shots and lens studies form one set with an explicit reference arm', () => {
  const videos = studyManifest.filter(study => study.mediaType === 'video');
  assert.equal(videos.length, 4);
  assert(videos.every(study => study.production.durationSeconds === 6));
  const lenses = studyManifest.filter(study => study.comparisonGroupId);
  assert.equal(lenses.length, 4);
  assert.equal(new Set(lenses.map(study => study.comparisonGroupId)).size, 1);
  assert.equal(lenses.filter(study => study.role === 'reference-arm').length, 1);
  assert.equal(lenses.find(study => study.role === 'reference-arm')?.controlId, 'lens-50mm');
});

test('asset names distinguish model, run, attempt and paired arm without path traversal', () => {
  const base = { baselineId: baseline.baselineId, studyId: 'study_dolly_v01' as const, modelKey: 'provider-model-version', runNumber: 1, attemptNumber: 1, arm: 'treatment' as const, artifact: 'output' as const, extension: 'mp4' as const };
  const name = studyAssetName(base);
  for (const variant of [{ ...base, runNumber: 2 }, { ...base, attemptNumber: 2 }, { ...base, arm: 'baseline' as const }, { ...base, modelKey: 'another-model-version' }]) assert.notEqual(studyAssetName(variant), name);
  assert.throws(() => studyAssetName({ ...base, modelKey: '../secret' }));
  assert.throws(() => studyAssetName({ ...base, runNumber: 0 }));
  assert.throws(() => studyAssetName({ ...base, artifact: 'metadata' }));
});

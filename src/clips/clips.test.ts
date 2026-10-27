import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { clips } from './data';
import { filterClips, parseFilters, filterSearch, groups } from './model';
import { filterGroups } from './types';
import { controls } from '../controls';

test('nine honest placeholders reference real posters, valid tags and existing controls', () => {
  assert.equal(clips.length, 9); assert.equal(new Set(clips.map(c => c.id)).size, 9);
  for (const clip of clips) {
    assert.equal(clip.videoUrl, null); assert.equal(clip.duration, null);
    assert.equal(clip.source.kind, 'placeholder'); assert.equal(clip.confidence, 'insufficient evidence');
    assert(existsSync('public' + clip.posterUrl)); assert(clip.license.notes.includes('No video'));
    assert.equal(clip.observations.length, 0); assert.equal(clip.inferences.length, 0); assert.equal(clip.evidence.length, 0);
    for (const field of [clip.cameraMovement, clip.framing, clip.lens, clip.cameraAngle, clip.lighting, clip.subjectMotion, clip.movementSpeed]) {
      assert.equal(field.status, 'unavailable'); assert.equal(field.value, null);
    }
    assert(clip.prompt.length > 150);
    for (const id of clip.controlIds) assert(controls.some(control => control.id === id));
    for (const group of groups) for (const tag of clip.categories[group]) assert((filterGroups[group] as readonly string[]).includes(tag));
  }
});
test('filters OR within groups and AND across groups; URL state round trips', () => {
  const filters = parseFilters('?cameraMovement=Dolly+In+%2F+Out&cameraMovement=Pan&lighting=Backlight');
  assert.deepEqual(filterClips(clips, filters).map(c => c.id), ['dolly-out', 'pan']);
  assert.deepEqual(parseFilters(filterSearch(filters)), filters);
  filters.composition = ['Close-Up']; assert.equal(filterClips(clips, filters).length, 0);
  assert.equal(filterClips(clips, parseFilters('')).length, 9);
});
test('unknown and duplicate URL tags do not corrupt filtering', () => {
  assert.deepEqual(parseFilters('?lens=Normal&lens=Normal&lens=Invented&unknown=x').lens, ['Normal']);
});

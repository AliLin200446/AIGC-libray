import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { curatedClips, mergeCuratedCatalog } from './curated';
import { clips as briefs } from './data';
import { mapCuratedReference, createPlaygroundState } from '../playground/mapping';
import { demoPrompt } from '../playground/controls';
import { filterClips, parseFilters } from './model';

test('six editorial projections reuse existing IDs without importing private media or rights',()=>{
 assert.deepEqual(curatedClips.map(c=>c.id),['film-discovery-05','film-discovery-10','film-discovery-02','film-discovery-01','film-discovery-11','film-discovery-13']);
 for(const c of curatedClips){assert(existsSync('public'+c.posterUrl));assert.equal(c.videoUrl,null);assert.equal(c.film,undefined);assert.equal(c.observations.length,0);assert.equal(c.cameraMovement.status,'unavailable');assert.equal(c.confidence,'insufficient evidence');assert(c.curated!.parameters.length>=7);assert(c.prompt.includes('No '));assert(!/Kubrick|Hitchcock|Anderson|Wong|Shining|Vertigo|Budapest|Mood for Love/.test(c.prompt));}
});
test('catalog never duplicates curated record IDs; unrelated original studies remain available',()=>{
 const merged=mergeCuratedCatalog([...curatedClips,...briefs]);assert.equal(merged.length,15);assert.equal(new Set(merged.map(c=>c.id)).size,15);
 assert.deepEqual(filterClips(curatedClips,parseFilters('?composition=Symmetrical')).map(c=>c.id),['film-discovery-02']);
});
test('unsupported tracking and dolly zoom do not become a false forward dolly or exact lens inference',()=>{
 for(const c of curatedClips.slice(0,2)){const m=mapCuratedReference(c);assert.equal(m.controls.movement,'static');assert.equal(m.controls.focalLength,50);assert.deepEqual(m.imported,[]);assert(m.notes.join(' ').includes('not AI analysis'));}
 const m=mapCuratedReference(curatedClips[2]!);assert.equal(m.controls.composition,'symmetrical');
 const state=createPlaygroundState(m);state.change({movement:'dolly',focalLength:35});assert(demoPrompt(state.value).includes('35mm'));assert(demoPrompt(state.value).includes('Translate'));state.resetReference();assert.equal(state.value.composition,'symmetrical');assert.equal(state.value.movement,'static');state.resetDefault();assert.equal(state.value.composition,'centered');
 assert.equal(mapCuratedReference(curatedClips[3]!).controls.composition,'negative-space');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalRoute,primaryNavigation,activeDestination,composeView} from './routes';
import {demoStack,initialControls} from '../playground/controls';
import {remixPose} from '../recipes/remix';
import {defaultWorld} from '../library/instrument/compose-state';
import {mockAnalysis} from '../library/reference/simulated-motion';
test('exactly three destinations with legacy aliases retaining reference state',()=>{assert.deepEqual(primaryNavigation.map(n=>n[1]),['EXPLORE','INDEX','AI ANALYZE']);assert.equal(canonicalRoute('/clips/dolly-in','?lens=Normal'),'/explore/dolly-in?lens=Normal');assert.equal(canonicalRoute('/playground','?film=film-discovery-04'),'/compose/workspace?film=film-discovery-04&shot=1');assert.equal(canonicalRoute('/about'),'/index');assert.equal(canonicalRoute('/recipes'),'/compose?presets=1');assert.equal(canonicalRoute('/recipes/test'),'/compose?recipe=test');assert.equal(canonicalRoute('/admin/references'),'/admin/references');assert.equal(canonicalRoute('/'),'/');});
test('active navigation includes details and never exposes Admin',()=>{assert.equal(activeDestination('/explore/static'),'/explore');assert.equal(activeDestination('/compose'),null);assert.equal(activeDestination('/library/dolly'),'/index');assert.equal(activeDestination('/admin/references'),null);});
test('reused continuous ruler focal overrides reach the same camera without quantization',()=>{const controls={...initialControls,focalLength:53};assert.equal(remixPose(demoStack(controls),defaultWorld(),1,null,1.6,controls.focalLength).focalLength,53);});
test('explicit simulation has fixture provenance and never claims film timestamps',()=>{assert.equal(mockAnalysis.provenance,'development-fixture');assert(mockAnalysis.timeline.includes('do not refer to the film'));assert.equal(mockAnalysis.cameraMovement.confidenceState,'insufficient evidence');});

test('Compose dispatch keeps P1 and P2 distinct while preserving legacy reference links',()=>{assert.equal(composeView(''),'instrument');assert.equal(composeView('?shot=1'),'shot');assert.equal(composeView('?clip=demo-dolly'),'shot');assert.equal(composeView('?workspace=1&edit=1'),'instrument');assert.equal(composeView('?presets=1'),'recipes');assert.equal(canonicalRoute('/compose','?clip=demo-dolly'),'/compose/workspace?clip=demo-dolly&shot=1');assert.equal(canonicalRoute('/playground'),'/compose/workspace?shot=1');});

 test('main, workspace and Analyze have the corrected hierarchy',()=>{
 assert.equal(canonicalRoute('/compose'),'/');
 assert.equal(canonicalRoute('/explore','?image=1'),'/analyze');
 assert.equal(canonicalRoute('/compose/workspace','?control=tilt'),'/compose/workspace?control=tilt');
 for(const p of ['/','/compose/workspace','/compose?shot=1'])assert.equal(activeDestination(p),null);
 assert.equal(activeDestination('/analyze'),'/analyze');
 });

// The supplied app-shell header follows the same public route hierarchy.
import {activeFor,isLongPage} from '../nav/site-header';
test('site header active states distinguish workspace action from section links',()=>{
 assert.equal(activeFor('/'),null);
 assert.equal(activeFor('/compose/workspace'),'compose');
 assert.equal(activeFor('/explore/film-discovery-05'),'explore');
 assert.equal(activeFor('/library/tilt'),'index');
 assert.equal(activeFor('/analyze'),'analyze');
 assert.equal(isLongPage('/library/tilt'),true);
 assert.equal(isLongPage('/analyze'),true);
 assert.equal(isLongPage('/explore'),false);
});

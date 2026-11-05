import test from 'node:test';
import assert from 'node:assert/strict';
import { controls } from '../controls';
import { toIndexModel } from './index-adapter';
import { indexPageHTML } from './index-page';
import { thumbSVG } from './control-thumbs';
test('Index uses all twelve real routes and registry copy/status without fabricated experiments',()=>{
 const m=toIndexModel(controls);assert.equal(m.controls.length,12);
 for(const c of m.controls){const r=controls.find(r=>r.id===c.slug)!;assert(r);assert.equal(c.behavior,r.shortDescription);assert.equal(c.status,r.status);assert.equal(c.experiments,r.experimentStatus);assert.equal(m.hrefFor(c),`/library/${r.id}`);assert(thumbSVG(c.thumb).includes('<svg'));}
 const html=indexPageHTML(m);assert.equal((html.match(/class="ix-card"/g)??[]).length,12);assert.equal((html.match(/class="ix-pixnum"/g)??[]).length,4);
 assert(m.about[0]!.includes('Simulated results are never claims about the source footage.'));
});
test('lens diagrams label horizontal full-frame field of view',()=>{
 for(const [f,deg]of [[24,74],[35,54],[50,40],[85,24]]){assert(thumbSVG({kind:'lens',focalMm:f!}).includes(`${deg}°`));}
});

import test from 'node:test';import assert from 'node:assert/strict';
import {shotHref,readInstrumentHandoff,instrumentSettings} from './instrument-handoff';
import {demoPrompt,demoStack} from './controls';
test('instrument handoff retains exact supported lens/composition/motion and synchronizes prompt and scene recipe',()=>{
 const href=shotHref(42.5,'rule-of-thirds','dolly');const c=readInstrumentHandoff(href.slice(href.indexOf('?')))!;assert.equal(c.focalLength,42.5);assert.equal(c.composition,'rule-of-thirds');assert.equal(c.movement,'dolly');assert(demoPrompt(c).includes('42.5mm'));assert(demoPrompt(c).includes('upper-left thirds'));assert(demoStack(c).some(p=>p.controlId==='dolly'));
});
test('unsupported inputs retain defaults; ordinary reference routes are unaffected',()=>{
 assert.deepEqual(instrumentSettings(135,'anything','orbit'),instrumentSettings(50,'centered','static'));assert.equal(readInstrumentHandoff('?clip=film-discovery-05'),null);assert.equal(readInstrumentHandoff('?shot=1'),null);assert.equal(readInstrumentHandoff('?shot=1&from=instrument&clip=pan'),null);
 for(const f of ['NaN','Infinity','-1','999'])assert.equal(readInstrumentHandoff('?shot=1&from=instrument&focal='+f)!.focalLength,50);
});

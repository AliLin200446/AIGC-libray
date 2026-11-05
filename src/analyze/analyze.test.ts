import test from 'node:test';
import assert from 'node:assert/strict';
import {EXAMPLE_RESULT} from './simulated-provider';
import {validateResult} from './analyze-model';
import {buildPrompt,promptText} from './prompt-builder';
test('example is explicitly simulated and malformed results are rejected',()=>{
 assert.equal(validateResult(EXAMPLE_RESULT).simulated,true);
 assert.throws(()=>validateResult({...EXAMPLE_RESULT,summary:undefined}));
});
test('readings and user-selected movement determine prompt text',()=>{
 const included=new Set(EXAMPLE_RESULT.readings.map(r=>r.id));
 const initial=promptText(buildPrompt(EXAMPLE_RESULT,included,'static','slow'));
 assert(initial.includes('35–50mm'));
 included.delete('fov');
 const changed=promptText(buildPrompt(EXAMPLE_RESULT,included,'dolly','steady'));
 assert(!changed.includes('35–50mm'));
 assert(changed.includes('Steady dolly in'));
 assert(!changed.includes('Locked-off'));
});

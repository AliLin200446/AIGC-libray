import test from 'node:test';
import assert from 'node:assert/strict';
import { clips as briefs } from './data';
import { originalClips, prototypeIds } from './originals';
import { mergeCuratedCatalog } from './curated';
import { filmClips } from './film';
import films from '../references/film-publication.json';
const clips=mergeCuratedCatalog([...originalClips,...briefs,...filmClips(films,Date.parse('2026-11-05'))]);
import { toClipPage } from './clip-adapter';
import { clipPageHTML } from './clip-page';
import * as fixtures from './clip-fixtures';
import type { ClipPage } from './clip-model';

test('every catalog record adapts to the shared layout without changing its prompt',()=>{
 for(const record of clips){const model=toClipPage(record,{now:Date.parse('2026-11-05')});const html=clipPageHTML(model);assert.equal(model.prompt,record.prompt);for(const title of ['Camera setup','What we can claim','Sources','cp-prompt-text'])assert(html.includes(title));assert(!html.includes('<iframe'));assert(!html.includes('src="https://i.ytimg'));assert.equal(model.claims.length,0);}
 for(const fixture of Object.values(fixtures)){const typed:ClipPage=fixture;assert(clipPageHTML(typed).includes('cp-hero'));}
});
test('media keeps permission gates, timestamp range and privacy-enhanced click facade',()=>{
 const record=clips.find(c=>c.id==='film-discovery-05')!;
 const model=toClipPage(record,{now:Date.parse('2026-11-05')});assert.equal(model.media.kind,'official');
 if(model.media.kind==='official'){assert(model.media.embedUrl.startsWith('https://www.youtube-nocookie.com/embed/'));assert(model.media.embedUrl.includes('end=18'));assert.equal(model.media.durationSec,148);}
 assert.equal(toClipPage(record,{now:Date.parse('2099-01-01')}).media.kind,'pending');
 const prose=record.observations[0]!.statement;assert.equal(model.claimsEmpty!.split(prose).length-1,1);
 assert.equal(toClipPage({...record,film:{...record.film!,embedUrl:'https://evil.example/embed/anything'}}).media.kind,'pending');
});
test('all nine schematic movement diagrams and unavailable data survive mapping',()=>{
 for(const id of ['dolly-in','dolly-out','tracking','pan','tilt','orbit','crane','handheld','static']){
  const model=toClipPage(clips.find(c=>c.id===id)!);assert.equal(model.media.kind,'pending');assert.equal(model.setup!.kind,id==='tracking'?'track-lateral':id);assert(model.params.filter(p=>p.label!=='Confidence').every(p=>p.status==='unavailable'));assert.equal(model.claims.length,0);
 }
});
test('renderer escapes data and rejects script and protocol-relative URLs',()=>{
 const model=toClipPage(clips[0]!);model.title='<script>alert(1)</script>';model.backHref='//evil.example';model.composeHref='javascript:alert(1)';const html=clipPageHTML(model);assert(!html.includes('<script>'));assert(!html.includes('href="//evil'));assert(!html.includes('href="javascript:'));
});

test('hybrid prototype contains two preserved films and four original licensed motion assets',()=>{
 assert.equal(prototypeIds.length,6);assert.equal(new Set(prototypeIds).size,6);
 assert.deepEqual(prototypeIds.filter(id=>id.startsWith('film-')),['film-discovery-05','film-discovery-10']);
 for(const clip of originalClips){const model=toClipPage(clip);assert.equal(model.media.kind,'hosted');assert.equal(model.collection,'Original demonstration');assert(clip.license.notes.includes('original geometry'));assert(clip.videoUrl?.endsWith('.mp4'));assert.equal(clip.duration,6);assert.equal(model.prompt,clip.prompt);}
});

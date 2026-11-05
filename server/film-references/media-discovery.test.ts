import {importUrls} from './import';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,copyFile,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TMDBCoverProvider,matchFilm,validImage,discoverMedia,reviewMedia,coverAllowed } from './media-discovery';
import { readReferences,updateReferences } from './store';
import { YouTubeDiscoveryProvider,parseDuration } from './discovery';
import { filmClips,permittedFilmEmbed,type PublicFilm } from '../../src/clips/film';
async function fixture(){const root=await mkdtemp(join(tmpdir(),'ff-media-'));await mkdir(join(root,'docs/research'),{recursive:true});await copyFile('docs/research/film-discovery-2026-10-26.json',join(root,'docs/research/film-discovery-2026-10-26.json'));return root;}
const grant={reviewer:'Test reviewer',evidence:'Test-only documented permission',verifiedAt:'2026-01-01',expiresAt:'2099-01-01'};
test('TMDB matching requires title and year; uses provider image configuration and favors landscape',async()=>{
 const root=await fixture();try{const c=(await readReferences(root))[0]!;let calls=0;
 const request:typeof fetch=async(url,init)=>{assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test');assert(!String(url).includes('test'));calls++;return Response.json(String(url).includes('configuration')?{images:{secure_base_url:'https://image.tmdb.org/t/p/',backdrop_sizes:['w780'],poster_sizes:['w500']}}:{results:[{id:1,title:c.film,release_date:`${c.year}-01-01`,backdrop_path:'/fixture.jpg',poster_path:'/poster.jpg'},{id:2,title:c.film,release_date:'1999-01-01'}]});};
 const found=await new TMDBCoverProvider('test',request).discover(c);assert.equal(calls,2);assert.equal(found.length,2);assert.equal(found[0]!.orientation,'landscape');assert.equal(found[0]!.rightsStatus,'unverified');assert.equal(found[0]!.url,'https://image.tmdb.org/t/p/w780/fixture.jpg');
 assert(!matchFilm({id:1,title:c.film,release_date:'1999-01-01'},c));assert(!matchFilm({id:1,title:'Different film',release_date:`${c.year}-01-01`},c));
 const empty=await new TMDBCoverProvider('test',async()=>Response.json({results:[]})).discover(c);assert.deepEqual(empty,[]);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('cover URL and embed source pairing reject hostile or mismatched URLs',()=>{
 for(const url of ['http://image.tmdb.org/t/p/w780/x.jpg','https://evil.test/x.jpg','https://image.tmdb.org.evil.test/t/p/w780/x.jpg','https://user@image.tmdb.org/t/p/w780/x.jpg'])assert(!validImage(url));
 assert(permittedFilmEmbed('https://www.youtube.com/watch?v=AfZbh4cteqI','https://www.youtube.com/embed/AfZbh4cteqI'));
 assert(!permittedFilmEmbed('https://www.youtube.com/watch?v=AfZbh4cteqI','https://www.youtube.com/embed/1wcTaimH9mI'));
 assert(!permittedFilmEmbed('https://www.youtube.com/watch?v=AfZbh4cteqI','https://www.youtube.com/embed/AfZbh4cteqI?autoplay=1'));
});
test('YouTube discovery filters channel ownership and retains duration/restrictions without rights grants',async()=>{
 const root=await fixture();try{const c=(await readReferences(root))[0]!;const provider=new YouTubeDiscoveryProvider('test',new Set(['official']),async url=>Response.json(String(url).includes('/search')?{items:[{id:{videoId:'AfZbh4cteqI'}}]}:{items:[{id:'AfZbh4cteqI',snippet:{title:'Clip',channelId:'official',channelTitle:'Studio'},status:{privacyStatus:'public',embeddable:true,license:'youtube'},contentDetails:{duration:'PT1M12S',regionRestriction:{blocked:['XX']}}},{id:'1wcTaimH9mI',snippet:{title:'Other',channelId:'unknown',channelTitle:'Unknown'},status:{privacyStatus:'public',embeddable:true}}]}));const found=await provider.discover(c);assert.equal(found.length,1);assert.equal(found[0]!.duration,72);assert.equal(found[0]!.permissionStatus,'unverified');assert.deepEqual(found[0]!.regionRestriction,{blocked:['XX']});assert.equal(parseDuration('bad'),null);}finally{await rm(root,{recursive:true,force:true});}
});
test('credential-free discovery keeps twelve IDs, grants, approvals and media intact and makes no requests',async()=>{
 const root=await fixture();try{await updateReferences(root,async records=>{records[0]!.permissions.embed=grant;});const before=await readReferences(root);await discoverMedia(root,'all',undefined,async()=>{throw Error('Unexpected network request');});const after=await readReferences(root);assert.deepEqual(after.map(c=>c.id),before.map(c=>c.id));assert.equal(after.length,12);assert.equal(after.reduce((n,c)=>n+(c.discovery?.videos.length??0),0),8);assert(after.every(c=>!c.discovery?.covers.length));for(const c of after){const b=before.find(b=>b.id===c.id)!;assert.deepEqual(c.permissions,b.permissions);assert.equal(c.status,b.status);assert.deepEqual(c.media,b.media);assert(c.discovery?.coverMessage.includes('missing'));}await assert.rejects(discoverMedia(root,'all','unknown'),/existing/);}finally{await rm(root,{recursive:true,force:true});}
});
test('cover selection revokes previous image grant and review never approves the film',async()=>{
 const root=await fixture();try{await updateReferences(root,async records=>{const c=records[0]!;c.discovery={at:new Date().toISOString(),covers:[{id:'tmdb-1-landscape',provider:'tmdb',filmId:1,title:c.film,year:c.year,url:'https://image.tmdb.org/t/p/w780/fixture.jpg',sourceUrl:'https://www.themoviedb.org/movie/1',orientation:'landscape',attribution:'TMDB',restrictions:'Test fixture',rightsStatus:'unverified',match:'exact-title-year'}],videos:[],coverMessage:'fixture',videoMessage:'fixture'};c.permissions.embed=grant;});
 let c=(await readReferences(root))[0]!;const input=()=>({id:c.id,version:c.version,reviewer:'Test',notes:'Test',candidateId:'tmdb-1-landscape'});
 c=await reviewMedia(root,{...input(),action:'attach-cover'});assert(!coverAllowed(c));await updateReferences(root,async rows=>{rows[0]!.cover!.grant=grant;});c=(await readReferences(root))[0]!;assert(coverAllowed(c));c=await reviewMedia(root,{...input(),action:'revoke-cover'});assert(!coverAllowed(c));assert.deepEqual(c.permissions.embed,grant);assert.equal(c.status,'candidate');await assert.rejects(reviewMedia(root,{...input(),candidateId:'unknown',action:'attach-cover'}),/discovered/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('public film projection requires distinct publication and embed grants, scene/playback review; image rights independent',()=>{
 const film:PublicFilm={id:'film-discovery-01',film:'Test film',year:2000,title:'Reference',description:'A scene',technique:'Unverified camera movement',prompt:'Exact prompt.',sourceUrl:'https://www.youtube.com/watch?v=AfZbh4cteqI',embedUrl:'https://www.youtube.com/embed/AfZbh4cteqI',attribution:'Test studio',startTime:0,duration:72,publicationApproved:true,review:{sceneEvidence:'Reviewed passage 0–12s',playbackVerified:true},embedGrant:grant,publicDisplayGrant:grant};
 assert.equal(filmClips([film]).length,1);assert.equal(filmClips([film,film]).length,1);assert.equal(filmClips([{...film,publicationApproved:false}]).length,0);assert.equal(filmClips([{...film,review:{...film.review,playbackVerified:false}}]).length,0);assert.equal(filmClips([{...film,embedGrant:{...grant,expiresAt:'2000-01-01'}}]).length,0);assert.equal(filmClips([{...film,publicDisplayGrant:undefined}]).length,0);
 assert.equal(filmClips([film])[0]!.posterUrl,'/clips/static.svg');assert.equal(filmClips([{...film,cover:{url:'https://evil.test/x.jpg',publicDisplayGrant:grant}}])[0]!.posterUrl,'/clips/static.svg');assert.deepEqual(filmClips([null,{}]),[]);
});

test('playback is not scene/technique approval; fully reviewed current sources are reused without another API search',async()=>{
 const root=await fixture();try{
  let c=(await readReferences(root))[0]!;
  await discoverMedia(root,'video',c.id);
  c=(await readReferences(root))[0]!;
  await importUrls(root,[{id:c.id,version:c.version,reviewer:'Test',notes:'Metadata fixture',sourceUrl:c.sourceUrl}],async()=>Response.json({type:'video',title:'Fixture',author_name:'Fixture publisher'}));
  c=(await readReferences(root))[0]!;
  c=await reviewMedia(root,{id:c.id,version:c.version,action:'review-video',reviewer:'Test',notes:'Playback alone',sceneEvidence:'Player ran but intended technique not observed.',playbackVerified:true});
  assert.equal(c.mediaReview?.sceneMatch,'unverified');assert.equal(c.mediaReview?.techniqueMatch,'unverified');assert.equal(c.status,'candidate');assert.deepEqual(c.permissions,{});
  c=await reviewMedia(root,{id:c.id,version:c.version,action:'review-video',reviewer:'Test',notes:'Explicit fixture review',sceneEvidence:'Fixture temporal evidence.',playbackVerified:true,sceneMatch:'verified',techniqueMatch:'verified'});
  await writeFile(join(root,'.env.local'),'YOUTUBE_API_KEY=fixture\nYOUTUBE_CHANNEL_IDS=official\n');
  await discoverMedia(root,'video',c.id,async()=>{throw Error('A verified source must not cause a new search');});
  const next=(await readReferences(root))[0]!;assert(next.discovery?.videoMessage.includes('retained'));assert.equal(next.discovery?.videos.length,1);assert.deepEqual(next.mediaReview,c.mediaReview);assert.deepEqual(next.permissions,{});assert.equal(next.status,'candidate');
 }finally{await rm(root,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { clipMedia } from './media';
import { filmClips,type PublicFilm } from './film';
test('public media respects rights, lazy playback, reset, reduced motion and failures',async()=>{
 class Node extends EventTarget {currentTime=0;paused=true;classList={add:(name:string)=>{this.className+=name;}};play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}load(){}hasAttribute(k:string){return k==='src'?!!this.src:this.attrs.has(k);}insertBefore(n:Node,b:Node){n.parent=this;this.children.splice(this.children.indexOf(b),0,n);}children:Node[]=[];textContent='';className='';src='';hidden=false;disabled=false;parent:Node|undefined;attrs=new Map<string,string>();constructor(public tag:string){super();}append(...nodes:Node[]){for(const n of nodes){n.parent=this;this.children.push(n);}}setAttribute(k:string,v:string){this.attrs.set(k,v);}removeAttribute(k:string){this.attrs.delete(k);if(k==='hidden')this.hidden=false;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}querySelector(tag:string){return this.children.find(n=>n.tag===tag)??null;} }
 let intersection:(entries:{isIntersecting:boolean}[])=>void=()=>{};let tick=()=>{};
 const document=Object.assign(new EventTarget(),{hidden:false,createElement:(tag:string)=>new Node(tag)});
 const motion=Object.assign(new EventTarget(),{matches:false});
 const mock={document,matchMedia:()=>motion,IntersectionObserver:class {constructor(callback:typeof intersection){intersection=callback;}observe(){}disconnect(){}},setInterval:(callback:()=>void)=>{tick=callback;return 1;},clearInterval:()=>{}};
 const saved=new Map(Object.keys(mock).map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));for(const [key,value]of Object.entries(mock))Object.defineProperty(globalThis,key,{configurable:true,value});
 try {const grant={reviewer:'Test',evidence:'Test fixture',verifiedAt:'2026-01-01',expiresAt:'2099-01-01'};const film:PublicFilm={id:'film-discovery-01',film:'Fixture',year:2000,title:'Fixture',description:'Fixture',technique:'Hypothesis',prompt:'Exact prompt',sourceUrl:'https://www.youtube.com/watch?v=AfZbh4cteqI',embedUrl:'https://www.youtube.com/embed/AfZbh4cteqI',attribution:'Test',startTime:5,duration:60,publicationApproved:true,review:{sceneEvidence:'Test passage',playbackVerified:true},embedGrant:grant,publicDisplayGrant:grant,cover:{url:'https://image.tmdb.org/t/p/w780/fixture.jpg',sourceUrl:'https://www.themoviedb.org/movie/1',logoUrl:'https://image.tmdb.org/t/p/original/logo.svg',attribution:'TMDB test fixture',publicDisplayGrant:grant}};
 const clip=filmClips([film])[0]!;const media=clipMedia(clip,true);const root=media.root as unknown as Node;
 assert.equal(root.querySelector('img')!.src,film.cover!.url);assert.equal(root.querySelector('iframe'),null);media.enter();assert.equal(root.querySelector('iframe'),null);
 root.querySelector('button')!.dispatchEvent(new Event('click'));assert.equal(root.querySelector('iframe')!.src,film.embedUrl+'?start=5');
 intersection([{isIntersecting:false}]);assert.equal(root.querySelector('iframe'),null);
 root.querySelector('img')!.dispatchEvent(new Event('error'));assert.equal(root.querySelector('img')!.src,'/clips/static.svg');
 root.querySelector('button')!.dispatchEvent(new Event('click'));clip.film!.expiresAt='2000-01-01';tick();assert.equal(root.querySelector('iframe'),null);assert(root.querySelector('button')!.disabled);root.querySelector('button')!.dispatchEvent(new Event('click'));assert.equal(root.querySelector('iframe'),null);media.dispose();
 // A licensed local fixture exercises the preview path without supplying film footage.
 const local={...clip,videoUrl:'/test-only.webm'};delete local.film;
 const preview=clipMedia(local);const video=(preview.root as unknown as Node).querySelector('video')!;
 assert.equal(video.src,'');assert.equal(video.paused,true);preview.enter();await Promise.resolve();assert.equal(video.paused,false);video.currentTime=4;preview.leave();assert.equal(video.paused,true);assert.equal(video.currentTime,0);assert.equal(video.hidden,true);
 motion.matches=true;preview.enter();await Promise.resolve();assert.equal(video.paused,true);motion.matches=false;preview.leave();preview.enter();await Promise.resolve();
 intersection([{isIntersecting:false}]);assert.equal(video.paused,true);assert.equal(video.currentTime,0);
 intersection([{isIntersecting:true}]);preview.enter();await Promise.resolve();video.dispatchEvent(new Event('error'));assert.equal(video.hidden,true);assert.match((preview.root as unknown as Node).querySelector('span')!.textContent,/UNAVAILABLE/);preview.leave();preview.enter();await Promise.resolve();const other=clipMedia(local);other.enter();await Promise.resolve();assert.equal(video.paused,true);assert.equal(video.currentTime,0);other.dispose();preview.dispose();
 }finally{for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});

test('curated public selection keeps source-specific thumbnail grants and revocation gates',async()=>{
 const {default:prepared}=await import('../references/film-publication.json');
 const {mergeCuratedCatalog}=await import('./curated');
 const now=Date.parse('2026-11-05');
 const selected=filmClips(prepared,now);
 assert.equal(selected.length,1);assert.deepEqual(selected.map(c=>c.id),['film-discovery-05']);
 assert.equal(selected[0]!.film!.endTime,18);assert.equal(selected[0]!.film!.thumbnail,undefined);
 const merged=mergeCuratedCatalog(selected);assert.equal(merged.length,6);assert.equal(merged.filter(c=>c.film).length,1);
 for(const raw of prepared.filter(r=>r.publicationApproved)){
  assert.equal(filmClips([{...raw,publicDisplayGrant:undefined}],now).length,0);
  assert.equal(filmClips([{...raw,review:{...raw.review,playbackVerified:false}}],now).length,0);
  assert.equal(filmClips([raw],Date.parse('2026-12-05')).length,0);
  const expired=filmClips([{...raw,thumbnail:{...raw.thumbnail,displayGrant:{...raw.publicDisplayGrant,expiresAt:'2020-01-01'}}}],now)[0]!;
  assert.equal(expired.film?.thumbnail,undefined);assert.equal(expired.posterUrl,'/clips/static.svg');
  const mismatch=filmClips([{...raw,thumbnail:{...raw.thumbnail,url:'https://i.ytimg.com/vi/XXXXXXXXXXX/hqdefault.jpg'}}],now)[0]!;
  assert.equal(mismatch.film?.thumbnail,undefined);
 }
});

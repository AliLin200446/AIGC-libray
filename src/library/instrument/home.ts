import { parseRemix,remixKey } from '../../recipes/model';
import { replaceFamily,remixLimitations } from '../../recipes/remix';
import '../../recipes/recipes.css';
import { createComposeUI } from './compose';
import { createLensRuler } from './lens-ruler';
import { canonicalFocal, focalCaption } from './lens';
import { controls } from '../../controls';
import type { ControlCategory, ControlId } from '../../controls/types';
import { el, link, button } from '../dom';
import { createDemonstration } from './scene';
import type { createReferenceMode } from '../reference/reference';
import '../reference/reference.css';
import '../library.css';
import './instrument.css';

type InteractionState = 'idle' | 'category-discovery' | 'control-hover' | 'control-active' | 'return-to-neutral';
const editorial: Record<ControlId,string> = {
  pan:'Turn the frame.', tilt:'Raise the gaze.', dolly:'Move through space.', orbit:'Change the relationship.',
  'lens-24mm':'Open the field.', 'lens-35mm':'Stay close to the scene.', 'lens-50mm':'Hold the reference.', 'lens-85mm':'Compress the distance.',
  centered:'Hold the center.', symmetrical:'Balance the frame.', 'rule-of-thirds':'Shift the anchor.', 'negative-space':'Leave room.',
};
const descriptions: Record<ControlId,string> = {
  pan:'Horizontal rotation · fixed camera position.', tilt:'Vertical rotation · fixed camera position.',
  dolly:'Physical camera translation · depth-dependent parallax.', orbit:'Camera arc · subject remains the visual anchor.',
  'lens-24mm':'Wider field of view · closer viewpoint for matched framing.',
  'lens-35mm':'Moderately wide field · closer viewpoint for matched framing.',
  'lens-50mm':'Reference focal length · neutral viewpoint.',
  'lens-85mm':'Narrower field of view · farther viewpoint for matched framing.',
  centered:'Subject anchor at the frame center.', symmetrical:'Subject and major structure share a central axis.',
  'rule-of-thirds':'Face anchor near the upper-left thirds intersection.', 'negative-space':'Subject to one side · a quiet region on the other.',
};
const annotationPaths: Partial<Record<ControlId,string>> = {
  pan:'M18 36 Q55 8 98 36 M89 23 L98 36 L81 38',
  tilt:'M55 53 Q86 30 55 8 M54 22 L55 8 L69 13',
  dolly:'M18 42 L97 21 M80 17 L97 21 L85 33 M18 48 L18 35 L33 35 L33 45',
};

export function renderInstrument(app: HTMLElement): void {
  document.body.classList.add('library-app','instrument-page');
  document.title='Framefield — Visual Control Library for Generative Media';
  app.replaceChildren();
  let remix:ReturnType<typeof parseRemix>=null;
  if(new URLSearchParams(location.search).has('remix')){try{remix=parseRemix(sessionStorage.getItem(remixKey));sessionStorage.removeItem(remixKey);}catch{/* Storage may be blocked. */}}
  let remixFocal:number|undefined;
  const remixBanner=el('aside','remix-banner');remixBanner.hidden=!remix;
  function describeRemix(){if(!remix)return;remixBanner.replaceChildren(el('span','',`REMIXING / ${remix.title} / ${remix.sourceRecipeId}`));const notes=el('details');notes.append(el('summary','','DETERMINISTIC PREVIEW / LIMITATIONS'));for(const note of remixLimitations(remix.workingControlStack))notes.append(el('p','',note));remixBanner.append(notes,button('EXIT REMIX',()=>{remix=null;remixFocal=undefined;remixBanner.hidden=true;history.replaceState(null,'','/');neutral();}));}
  describeRemix();
  const header=el('header','instrument-header');
  const wordmark=el('h1'); wordmark.append(link('/','FRAMEFIELD','wordmark'));
  const indexToggle=button('INDEX ↗',toggleIndex,'index-toggle'); indexToggle.setAttribute('aria-expanded','false'); indexToggle.setAttribute('aria-controls','instrument-index');
  let reference: ReturnType<typeof createReferenceMode> | undefined;
  let disposed = false;
  let referenceLoad: Promise<void> | undefined;
  async function openReference() {
    setComposing(false);
    if (reference) { reference.open(); return; }
    if (referenceLoad) return;
    referenceMode.disabled = true;
    referenceMode.textContent = 'LOADING…';
    referenceLoad = import('../reference/reference').then(module => {
      if (!disposed) { mountReference(module.createReferenceMode); reference!.open(); }
    }).catch(() => { description.textContent = 'Reference Mode could not load. Please try again.'; })
      .finally(() => { referenceLoad = undefined; referenceMode.disabled = false; referenceMode.textContent = 'REFERENCE ↗'; });
    await referenceLoad;
  }
  const exploreMode=button('EXPLORE',()=>{setComposing(false);if(surface.dataset.view&&surface.dataset.view!=='explore')reference?.explore();});
  const composeMode=button('COMPOSE ↗',()=>{if(surface.dataset.view&&surface.dataset.view!=='explore')reference?.explore();setComposing(true);});
  function modeState(target:HTMLElement, active:boolean) { target.setAttribute('aria-pressed',String(active)); if(active)target.setAttribute('aria-current','page');else target.removeAttribute('aria-current'); }
  let composing=false;
  function setComposing(value:boolean){composing=value;document.body.classList.toggle('compose-open',value);modeState(composeMode,value);modeState(exploreMode,!value);if(value)modeState(referenceMode,false);composeUI.setEnabled(value);syncDiscovery();}
  const referenceMode=button('REFERENCE ↗',()=>{void openReference();});
  const navigation=el('nav','instrument-nav'); navigation.setAttribute('aria-label','Library modes');
  navigation.append(exploreMode,composeMode,referenceMode,link('/clips','CLIPS ↗','recipes-nav'),link('/recipes','RECIPES ↗','recipes-nav'),indexToggle);header.append(wordmark,navigation);
  const surface=el('section','instrument-surface'); surface.setAttribute('aria-label','Visual control instrument'); surface.dataset.state='idle';
  const frame=el('div','instrument-frame');
  const viewport=el('div','instrument-viewport'); viewport.dataset.demonstration='deterministic-visual-vocabulary';
  const guides=el('div','instrument-guides'); guides.setAttribute('aria-hidden','true');
  guides.innerHTML='<span class="guide-v one"></span><span class="guide-v two"></span><span class="guide-h one"></span><span class="guide-h two"></span><span class="guide-anchor"></span><span class="guide-checker a"></span><span class="guide-checker b"></span><span class="guide-checker c"></span><span class="guide-checker d"></span><span class="guide-space"></span>';
  const annotation=el('div','technical-annotation'); annotation.setAttribute('aria-hidden','true');
  const orbitGuide=el('div','orbit-annotation'); orbitGuide.setAttribute('aria-hidden','true');
  orbitGuide.innerHTML='<svg viewBox="0 0 1000 625"><path d="M430 493 C375 540 625 555 587 502 M575 510 L587 502 L595 516"/><circle cx="500" cy="523" r="2"/></svg>';
  const lensReadout=el('div','instrument-readout'); lensReadout.append(el('span','focal-number','50 MM'),el('span','','FULL FRAME EQ.'));
  const reset=button('RESET CONTROL',resetHome,'home-reset');
  frame.append(viewport,guides,annotation,orbitGuide,lensReadout,reset);
  const caption=el('div','instrument-caption'); caption.setAttribute('aria-live','polite');
  const controlLabel=el('span','caption-control');
  const currentName=el('span','active-name','A point of view.');
  const description=el('span','active-description','Move through the frame.');
  const explore=link('/library/lens-50mm','EXPLORE ↗','instrument-explore'); explore.hidden=true;
  caption.append(controlLabel,currentName,description,explore);
  frame.append(caption); surface.append(frame);
  const index=el('nav','instrument-index'); index.id='instrument-index'; index.hidden=true; index.setAttribute('aria-label','All visual controls');
  index.append(link('/index','COMPONENT CATALOG ↗','catalog-index-link'));
  let state: InteractionState='idle';
  let active: ControlId|null=null;
  let category: ControlCategory|null=null;
  let returnTimer: ReturnType<typeof setTimeout>|undefined;
  let collapseTimer: ReturnType<typeof setTimeout>|undefined;
  let touchArmed: ControlId|null=null;
  let lastPointerType='mouse';
  const zones=new Map<ControlCategory,HTMLElement>();
  const categories=new Map<ControlCategory,HTMLButtonElement>();
  let scene: ReturnType<typeof createDemonstration>|undefined;
  const ruler=createLensRuler(()=>scene?.getFocalLength()??50,value=>{
    cancelReturn();if(remix&&!composing&&surface.dataset.view!=='demo'){remixFocal=value;const canonical=canonicalFocal(value);if(canonical)remix.workingControlStack=replaceFamily(remix.workingControlStack,{controlId:`lens-${canonical}mm`,parameters:{protocol:scene?.editorState().framingLock===false?'fixed-viewpoint':'matched-framing'}});scene?.setFocalLength(value);}else scene?.setFocalLength(value,surface.dataset.view==='demo');
    if(surface.dataset.view!=='demo') { active=null;setState('control-active');lensCaption(value); }
  },dragging=>{if(composing){if(dragging)scene?.beginTransaction();else scene?.commitTransaction();}if(dragging){cancelReturn();if(collapseTimer!==undefined)clearTimeout(collapseTimer);}});
  const framing=button('FRAMING / LOCKED',()=>{if(!scene)return;scene.setFramingLock(!scene.editorState().framingLock);framing.textContent=scene.editorState().framingLock?'FRAMING / LOCKED':'FRAMING / FREE';framing.setAttribute('aria-pressed',String(scene.editorState().framingLock));lensCaption(scene.getFocalLength());});framing.className='framing-lock';framing.setAttribute('aria-pressed','true');framing.title='Locked compensates camera distance; Free keeps camera position fixed.';ruler.root.append(framing);
  function lensCaption(value:number) {
    const caption=focalCaption(value);if(currentName.textContent!==caption)currentName.textContent=caption;
    const detail=scene?.editorState().framingLock===false?'Fixed camera position · focal length changes framing.':'Matched subject framing · changing spatial relationships.';if(description.textContent!==detail)description.textContent=detail;
    if(controlLabel.textContent!=='LENS / DETERMINISTIC EXPLORATION')controlLabel.textContent='LENS / DETERMINISTIC EXPLORATION';
    const mm=canonicalFocal(value);explore.hidden=category==='lens'||mm===undefined;if(mm!==undefined){explore.href=`/library/lens-${mm}mm`;explore.textContent=`EXPLORE ${mm}MM ↗`;}
  }
  const setState=(value: InteractionState)=>{state=value; surface.dataset.state=value;};
  const hoverEnabled=()=>!window.matchMedia('(hover: none), (max-width: 700px)').matches;
  function cancelReturn() { if(returnTimer!==undefined) clearTimeout(returnTimer); }
  function neutral() {
    cancelReturn(); active=null; touchArmed=null; surface.dataset.activeControl=''; guides.dataset.control=''; annotation.replaceChildren(); orbitGuide.dataset.active='false'; controlLabel.textContent='';
    setState('return-to-neutral'); scene?.activate(null);
    if(!scene) setState(category?'category-discovery':'idle');
    currentName.textContent='A point of view.'; description.textContent='Move through the frame.'; explore.hidden=true;
    surface.querySelectorAll('[data-control]').forEach(item=>{item.removeAttribute('aria-current');item.classList.remove('is-active');});
    index.querySelectorAll('[data-control]').forEach(item=>{item.removeAttribute('aria-current');item.classList.remove('is-active');});
  }
  function scheduleReturn() {if(remix || composing || ruler.dragging || category==='lens')return;cancelReturn();if(surface.dataset.view&&surface.dataset.view!=='explore')return;returnTimer=setTimeout(neutral,160);}
  function syncDiscovery() {
    const exploring=!composing&&(!surface.dataset.view||surface.dataset.view==='explore');
    zones.forEach((zone,key)=>{const shown=key===category||(key==='lens'&&(exploring||composing));zone.dataset.revealed=String(shown);categories.get(key)?.setAttribute('aria-expanded',String(shown));});
  }
  function discover(next: ControlCategory|null) {
    if(collapseTimer!==undefined)clearTimeout(collapseTimer);
    if(ruler.dragging)return;
    const enteringLens=next==='lens'&&category!=='lens';
    category=next;
    if(enteringLens&&(!surface.dataset.view||surface.dataset.view==='explore')){cancelReturn();active=null;surface.dataset.activeControl='';guides.dataset.control='';annotation.replaceChildren();orbitGuide.dataset.active='false';lensCaption(scene?.getFocalLength()??50);}

    syncDiscovery();
    if(!active) setState(next?'category-discovery':'idle');
  }
  function activate(id: ControlId, mode: 'control-hover'|'control-active'='control-hover') {
    if(surface.dataset.view&&surface.dataset.view!=='explore')return;
    cancelReturn(); if(active!==id){if(remix&&!composing){remix.workingControlStack=replaceFamily(remix.workingControlStack,{controlId:id,parameters:{}});if(id.startsWith('lens-'))remixFocal=undefined;scene?.applyRecipe(remix.workingControlStack,null,remix.cameraState,remixFocal);describeRemix();}else scene?.activate(id);} active=id;setState(mode);
    surface.dataset.activeControl=id;guides.dataset.control=id;
    const control=controls.find(item=>item.id===id);
    if(!control)return;
    currentName.textContent=editorial[id];description.textContent=descriptions[id];
    const siblings=controls.filter(item=>item.category===control.category);
    controlLabel.textContent=control.name.toUpperCase()+'  /  '+String(siblings.findIndex(item=>item.id===id)+1).padStart(2,'0')+' — 04';
    orbitGuide.dataset.active=String(id==='orbit');
    annotation.replaceChildren();
    const path=annotationPaths[id];
    if(path)annotation.innerHTML='<svg viewBox="0 0 115 65"><path d="'+path+'"/></svg><span>'+({pan:'YAW / FIXED POSITION',tilt:'PITCH / FIXED POSITION',dolly:'CAMERA TRANSLATION'}[id as 'pan'|'tilt'|'dolly'])+'</span>';
    if(id.startsWith('lens-'))annotation.innerHTML='<svg viewBox="0 0 115 65"><path class="fov-rays"/><circle cx="57.5" cy="52" r="2"/></svg><span>HORIZONTAL FIELD OF VIEW</span>';

    explore.textContent='EXPLORE ↗';explore.href=`/library/${id}`;explore.hidden=false;
    document.querySelectorAll<HTMLElement>('.instrument-page [data-control]').forEach(item=>{
      if(item.dataset.control===id){item.setAttribute('aria-current','true');item.classList.add('is-active');}else {item.removeAttribute('aria-current');item.classList.remove('is-active');}
    });
  }
  function controlLink(id: ControlId): HTMLAnchorElement {
    const control=controls.find(item=>item.id===id)!;
    const item=link(`/library/${id}`,control.category==='lens'?control.name.replace('mm',''):control.name,'instrument-control'); item.dataset.control=id; item.dataset.ffFamily=control.category; item.setAttribute('aria-label',control.name);
    item.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'&&hoverEnabled())activate(id);});
    item.addEventListener('pointerleave',event=>{if(event.pointerType!=='touch'&&hoverEnabled())scheduleReturn();});
    item.addEventListener('focus',()=>activate(id));
    item.addEventListener('blur',scheduleReturn);
    item.addEventListener('pointerdown',event=>{lastPointerType=event.pointerType;});
    item.addEventListener('keydown',()=>{lastPointerType='keyboard';});
    item.addEventListener('click',event=>{
      const tapMode=lastPointerType==='touch'||(lastPointerType!=='keyboard'&&window.matchMedia('(hover: none), (max-width: 700px)').matches);
      if(tapMode&&touchArmed!==id){event.preventDefault();touchArmed=id;activate(id,'control-active');return;}
      setState('control-active');
    });
    return item;
  }
  for(const name of ['composition','lens','camera'] as const) {
    const zone=el('div',`discovery-zone zone-${name}`);zone.dataset.revealed='false';
    const trigger=button(name.toUpperCase(),()=>{if(name==='lens'){discover(name);lensCaption(scene?.getFocalLength()??50);}else{discover(name);if(!remix)neutral();}},'category-trigger');
    trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls',`choices-${name}`);
    const choices=el('div','zone-controls');choices.id=`choices-${name}`;
    if(name==='lens')choices.append(ruler.root);
    else for(const control of controls.filter(item=>item.category===name))choices.append(controlLink(control.id));
    zone.append(trigger,choices);zones.set(name,zone);categories.set(name,trigger);
    zone.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'&&hoverEnabled()){cancelReturn();discover(name);}});
    zone.addEventListener('pointerleave',event=>{if(name==='lens'&&!composing&&(!surface.dataset.view||surface.dataset.view==='explore'))return;if(event.pointerType!=='touch'&&hoverEnabled()){scheduleReturn();collapseTimer=setTimeout(()=>{if(category===name&&!ruler.dragging&&(name!=='lens'||document.activeElement!==reset)&&!zone.contains(document.activeElement)){discover(null);if(!remix&&!composing&&name==='lens'&&(!surface.dataset.view||surface.dataset.view==='explore'))neutral();}},280);}});
    trigger.addEventListener('focus',()=>discover(name));
    zone.addEventListener('focusout',()=>setTimeout(()=>{if(name==='lens'&&!composing&&(!surface.dataset.view||surface.dataset.view==='explore'))return;if(!hoverEnabled()&&lastPointerType!=='keyboard')return;if(!ruler.dragging&&(name!=='lens'||document.activeElement!==reset)&&!zone.contains(document.activeElement)){if(category===name){discover(null);if(!remix&&!composing&&name==='lens'&&(!surface.dataset.view||surface.dataset.view==='explore'))neutral();}scheduleReturn();}},0));
    frame.append(zone);
    const indexGroup=el('div','index-group');indexGroup.append(el('h2','',name.toUpperCase()));
    controls.filter(item=>item.category===name).forEach(control=>indexGroup.append(controlLink(control.id))); index.append(indexGroup);
  }
  function toggleIndex() {
    const wasOpen=!index.hidden;
    reference?.explore();
    index.hidden=wasOpen; indexToggle.setAttribute('aria-expanded',String(!index.hidden));
    if(!index.hidden){neutral();discover(null);index.querySelector<HTMLAnchorElement>('a')?.focus();}
    else {neutral();indexToggle.focus();}
  }
  function resetHome() {
    if(remix){remix.workingControlStack=[];remix.cameraState=null;remixFocal=undefined;}const showLens=category==='lens'||surface.dataset.view==='demo';if(!composing)reference?.explore();neutral();discover(showLens?'lens':null);}
  function keydown(event:KeyboardEvent) {
    lastPointerType='keyboard';
    if(event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement)return;
    if(composing&&event.key==='Escape'){scene?.selectObject(null);return;}
    if(event.key==='Escape'){index.hidden=true;indexToggle.setAttribute('aria-expanded','false');resetHome();reset.focus();}
  }
  document.addEventListener('keydown',keydown);
  caption.addEventListener('pointerenter',cancelReturn);caption.addEventListener('pointerleave',scheduleReturn);
  explore.addEventListener('focus',cancelReturn);explore.addEventListener('blur',scheduleReturn);
  const footer=el('footer','instrument-footer');
  footer.append(el('span','','Visual Control Library for Generative Media'),el('span','desktop-hint','Approach an edge. Find a different view.'),el('span','touch-hint','Tap a category, then a control. Explore to go deeper.'),el('span','','DETERMINISTIC DEMONSTRATION'));
  app.append(header,remixBanner,surface,index,footer);
  const composeUI=createComposeUI(frame,()=>scene);
  function mountReference(createReferenceMode: typeof import('../reference/reference').createReferenceMode) {
    reference=createReferenceMode({frame,surface,onView:(view,stack)=>{
    setComposing(false);cancelReturn();discover(null);index.hidden=true;indexToggle.setAttribute('aria-expanded','false');
    annotation.replaceChildren();orbitGuide.dataset.active='false';guides.dataset.control='';
    modeState(exploreMode,view==='explore');
    modeState(referenceMode,view!=='explore');
    scene?.setPaused(view==='reference');
    if(view==='demo') {
      active=null; scene?.applyStack(stack);
      const compositions=stack.filter(id=>!id.startsWith('lens-'));guides.dataset.control=compositions[compositions.length-1]??'';
    } else if(view==='explore'){if(remix)scene?.applyRecipe(remix.workingControlStack,null,remix.cameraState,remixFocal);else neutral();}
  }});
  }
  modeState(composeMode,false);modeState(exploreMode,true);modeState(referenceMode,false);
  try {
    scene=createDemonstration(viewport,mm=>{ruler.render(mm);if(category==='lens'&&surface.dataset.view!=='demo')lensCaption(mm);lensReadout.firstElementChild!.textContent=`${Math.round(mm)} MM`; const spread=38*18/mm; annotation.querySelector('.fov-rays')?.setAttribute('d',`M${57.5-spread} 14 L57.5 52 L${57.5+spread} 14`);},()=>{if(state==='return-to-neutral')setState(category?'category-discovery':'idle');},()=>{composeUI.refresh();if(scene){framing.textContent=scene.editorState().framingLock?'FRAMING / LOCKED':'FRAMING / FREE';framing.setAttribute('aria-pressed',String(scene.editorState().framingLock));}});
  } catch {
    viewport.append(el('p','webgl-fallback','The interactive scene requires WebGL. Use the category labels or Index to explore all 12 controls.'));
    viewport.dataset.unavailable='true';composeMode.disabled=true;
  }
  if(remix){scene?.applyRecipe(remix.workingControlStack,remix.sceneState,remix.cameraState);guides.dataset.control=remix.workingControlStack.filter(c=>controls.find(d=>d.id===c.controlId)?.category==='composition').at(-1)?.controlId??'';}
  const initial=window.location.hash.slice(1);
  if(initial==='camera'||initial==='lens'||initial==='composition')discover(initial);
  else syncDiscovery();
  const dispose=()=>{disposed=true;cancelReturn();if(collapseTimer!==undefined)clearTimeout(collapseTimer);reference?.dispose();composeUI.dispose();ruler.dispose();scene?.dispose();document.removeEventListener('keydown',keydown);};
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});
  if(import.meta.hot)import.meta.hot.dispose(dispose);
}

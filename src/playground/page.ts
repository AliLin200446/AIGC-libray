import {readAnalyzeHandoff} from './analyze-handoff';
import {readControlMapping} from './control-handoff';
import { readInstrumentHandoff } from './instrument-handoff';
import {createLensRuler} from '../library/instrument/lens-ruler';
import { archiveShell,pageTitle } from '../library/archive';
import { el,button,link } from '../library/dom';
import { createDemonstration } from '../library/instrument/scene';
import { restoreDemoControls,demoStack,demoPrompt,type DemoControls } from './controls';
import { mapReference,mapCuratedReference,referenceQuery,createPlaygroundState,type ReferenceMapping } from './mapping';
import { clips } from '../clips/catalog';
import '../library/instrument/instrument.css';
import './playground.css';
export async function renderPlayground(app:HTMLElement){
 const shotMode=location.pathname==='/compose/workspace'||new URLSearchParams(location.search).get('shot')==='1';const handoff=readInstrumentHandoff(location.search);
 archiveShell(app);document.title='Compose — Framefield';const main=el('main','playground');main.dataset.ffNoTrail='';if(shotMode)main.classList.add('shot-workspace');app.append(main);main.append(pageTitle('COMPOSE / CAMERA CONTROLS','Try the shot.','Adjust creative controls in the Canonical Scene. The preview and prompt share one state.'));
 const tools=el('div','compose-tools technical');tools.append(link('/','← CAMERA INSTRUMENT'),link('/compose?workspace=1&edit=1','SCENE WORKSPACE →'),link('/compose?presets=1','RECIPE PRESETS →'));
 let mapping:ReferenceMapping|null=readAnalyzeHandoff(location.search)??readControlMapping(location.search);const query=referenceQuery(location.search);let warning='';
 try{if(query?.kind==='clip'){const c=clips.find(c=>c.id===query.id);if(c)mapping=c.curated?mapCuratedReference(c):mapReference({id:c.id,title:c.film?`${c.film.title} / ${c.title}`:c.title,backUrl:`/explore/${c.id}`,movement:c.cameraMovement,composition:c.framing,lens:c.lens});}
 else if(query?.kind==='film'&&import.meta.env.DEV){const {loadFilmParameters}=await import('../dev/playground-reference');const ref=await loadFilmParameters(query.id);if(ref)mapping=mapReference(ref);}
 if(location.search&&!mapping&&!handoff&&(!shotMode||new URLSearchParams(location.search).has('clip')||new URLSearchParams(location.search).has('film')||new URLSearchParams(location.search).has('control')))warning='Reference unavailable or invalid. Default scene loaded; no URL parameters were applied.';
 }catch{warning='Reference could not be loaded. Default scene is available.';}
 const state=createPlaygroundState(mapping);if(handoff)state.change(handoff);const stateKey=JSON.stringify([query,mapping?.reference.id??null,mapping?.controls??null,handoff]);const restored=history.state?.playground;if(restored?.key===stateKey){const value=restoreDemoControls(JSON.stringify(restored.value));if(value)state.change(value);}if(warning)main.append(el('p','playground-notice',warning));
 if(mapping){const context=el('div','playground-reference-context');main.append(context);context.append(el('p','playground-context',`Based on: ${mapping.reference.title}`),link(mapping.reference.backUrl,'← Back to Reference'));const details=el('details');details.append(el('summary','','Imported settings and uncertainty'));for(const note of mapping.notes)details.append(el('p','',note));context.append(details);}else main.append(el('p','',handoff?'Camera Instrument settings / supported creative controls transferred':'Canonical Scene / default creative settings'));
 const workspace=el('div','compose-workspace');
 const controls=el('aside','compose-controls');controls.setAttribute('aria-label','Camera controls');
 const stage=el('section','compose-stage');stage.setAttribute('aria-label','Live camera preview');
 const stageBar=el('div','compose-stage-bar technical');const telemetry=el('span');
 stageBar.append(el('span','','01 / CANONICAL SCENE'),telemetry);
 const viewport=el('div','instrument-viewport playground-viewport');
 const frame=el('div','instrument-frame compose-frame');
 const guides=el('div','instrument-guides');guides.setAttribute('aria-hidden','true');
 guides.innerHTML='<span class="guide-v one"></span><span class="guide-v two"></span><span class="guide-h one"></span><span class="guide-h two"></span><span class="guide-anchor"></span><span class="guide-space"></span>';
 frame.append(viewport,guides);
 const prompt=el('p','compose-prompt-text');prompt.setAttribute('aria-label','Current video prompt');prompt.tabIndex=0;
 const feedback=el('p','compose-feedback technical');feedback.setAttribute('role','status');
 let scene:ReturnType<typeof createDemonstration>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 const radios=new Map<'movement'|'composition',HTMLInputElement[]>();
 const ranges=new Map<'distance'|'duration',{input:HTMLInputElement;output:HTMLOutputElement}>();
 const groupTitles=new Map<keyof DemoControls,HTMLElement>();
 function sync(){
  const value=state.value;
  history.replaceState({...history.state,playground:{key:stateKey,value}},'',location.href);
  for(const[key,items]of radios)for(const input of items)input.checked=input.value===value[key];
  for(const[key,{input,output}]of ranges){input.value=String(value[key]);output.value=String(value[key])+(key==='distance'?' m':' s');input.style.setProperty('--position',`${(value[key]-Number(input.min))/(Number(input.max)-Number(input.min))*100}%`);}
  for(const[key,title]of groupTitles){title.dataset.provenance=mapping?.imported.includes(key)?value[key]===mapping.controls[key]?'imported':'edited':'';}
  prompt.textContent=demoPrompt(value);ruler.render(value.focalLength);guides.dataset.control=value.composition;
  telemetry.textContent=`${value.movement==='static'?'STATIC':'DOLLY IN'} / ${value.focalLength} MM`;
  scene?.applyRecipe(demoStack(value),null,null,value.focalLength);feedback.textContent='Prompt updated.';
 }
 function group(title:string,family:string){const field=el('fieldset','compose-group');field.dataset.ffFamily=family;const legend=el('legend','technical',title);field.append(legend);controls.append(field);return {field,legend};}
 function choice(key:'movement'|'composition',title:string,family:string,values:readonly [string,string][]){
  const {field,legend}=group(title,family);groupTitles.set(key,legend);const segments=el('div','compose-segments');const items:HTMLInputElement[]=[];
  for(const[value,text]of values){const label=el('label','compose-segment');const input=el('input');input.type='radio';input.name=`compose-${key}`;input.value=value;input.setAttribute('aria-label',text);
   input.addEventListener('change',()=>{if(input.checked){state.change({[key]:value});sync();}});label.append(input,el('span','',text));segments.append(label);items.push(input);}
  field.append(segments);radios.set(key,items);return field;
 }
 const motion=choice('movement','Camera Motion','camera',[['static','Static'],['dolly','Dolly in']]);
 function range(host:HTMLElement,key:'distance'|'duration',title:string,min:number,max:number,step:number){
  const wrap=el('label','compose-range');const label=el('span','technical',title),output=el('output');groupTitles.set(key,label);
  const input=el('input');input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.setAttribute('aria-label',title);
  input.addEventListener('input',()=>{state.change({[key]:input.valueAsNumber});sync();});wrap.append(label,output,input);host.append(wrap);ranges.set(key,{input,output});
 }
 range(motion,'distance','Dolly travel (m)',.25,2,.25);
 choice('composition','Composition','composition',[['centered','Centered'],['symmetrical','Symmetrical'],['rule-of-thirds','Rule of thirds'],['negative-space','Negative space']]);
 const lens=el('div','compose-lens');lens.dataset.ffFamily='lens';
 const ruler=createLensRuler(()=>state.value.focalLength,value=>{state.change({focalLength:value});sync();},()=>{});lens.append(ruler.root);
 const timing=group('Timing','camera');range(timing.field,'duration','Shot duration (seconds)',1,12,1);
 const replay=button('Replay Camera Move',()=>scene?.applyRecipe(demoStack(state.value),null,null,state.value.focalLength),'compose-replay technical');
 const fit=el('div','compose-frame-fit');
 const mount=el('div','compose-frame-mount');
 mount.append(el('span','compose-side-label compose-side-composition technical','COMPOSITION'),frame,el('span','compose-side-label compose-side-camera technical','CAMERA'));
 fit.append(mount);stage.append(lens,stageBar,fit,replay);workspace.append(controls);
 if(shotMode){workspace.prepend(stage);const lensGroup=group('Lens','lens');lensGroup.field.append(lens);controls.prepend(lensGroup.field);mount.querySelectorAll('.compose-side-label').forEach(e=>e.remove());}else main.prepend(stage);
 // Measure the real header, including wrapped navigation and font changes.
 const header=document.querySelector<HTMLElement>('.ff-hdr');
 const measureHeader=()=>main.style.setProperty('--compose-header-height',`${header?.getBoundingClientRect().height??0}px`);
 const headerObserver=new ResizeObserver(measureHeader);if(header)headerObserver.observe(header);measureHeader();
 const output=el('section','compose-output');output.setAttribute('aria-label','Generated prompt');
 const outputHead=el('div','compose-output-head');
 const copy=button('Copy Prompt',()=>{const text=prompt.textContent??'';void navigator.clipboard.writeText(text).then(()=>{feedback.textContent='Copied';clearTimeout(timer);timer=setTimeout(()=>{feedback.textContent='';},2200);}).catch(()=>{feedback.textContent='Clipboard unavailable. Select and copy the visible prompt.';});},'compose-copy technical');
 outputHead.append(el('h2','technical','02 / CURRENT PROMPT'),copy);
 const actions=el('div','playground-actions technical');if(mapping)actions.append(button('Reset to Reference',()=>{state.resetReference();sync();}));actions.append(button('Reset to Default',()=>{state.resetDefault();sync();}));
 const outputFoot=el('div','compose-output-foot');outputFoot.append(feedback,actions);
 output.append(outputHead,prompt,outputFoot);
 const basis=el('p','compose-basis',handoff?'Camera Instrument settings are authored creative controls, not film measurements. Unsupported camera placement, rig and timing use workspace defaults.':mapping?.reference.basis==='curated'?'Curated creative settings, not AI analysis or recovered film measurements. The prompt describes the supported schematic scene.':'Imported inferences remain uncertain. Unavailable settings use creative defaults, not recovered film measurements. The schematic scene does not reproduce the original set, lighting, acting or focus.');
 output.append(basis);main.append(workspace,output,tools);if(shotMode)workspace.append(output);
 if(shotMode&&!history.state?.playground)scrollTo(0,0);
 try{scene=createDemonstration(viewport,()=>{},()=>{});}catch{viewport.textContent='3D preview unavailable. Controls and prompt remain usable.';}sync();
 const dispose=()=>{headerObserver.disconnect();ruler.dispose();scene?.dispose();clearTimeout(timer);};window.addEventListener('pagehide',e=>{if(e.persisted)scene?.setPaused(true);else dispose();});window.addEventListener('pageshow',e=>{if(e.persisted)scene?.setPaused(false);});import.meta.hot?.dispose(dispose);
}

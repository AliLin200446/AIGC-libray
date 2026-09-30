import { controls } from '../../controls';
import { button, el, link } from '../dom';
import { referenceProvider, ReferenceAnalysisEngine } from './provider';
import { addToStack, LocalReference, validateImage } from './state';
import type { Finding, ReconstructionControlId, ReferenceAnalysis, ReferenceAnalysisProvider } from './types';
import { analysisErrors } from './errors';
import './reference.css';

type View = 'explore' | 'reference' | 'demo';
type Overlay = 'anchor' | 'thirds' | 'axis' | 'space' | 'perspective';
interface Options {
  frame: HTMLElement;
  surface: HTMLElement;
  onView: (view: View, stack: readonly ReconstructionControlId[]) => void;
  provider?: ReferenceAnalysisProvider | null;
}
const nameFor = (id: ReconstructionControlId) => controls.find(control => control.id === id)!.name;

export function createReferenceMode({ frame, surface, onView, provider = referenceProvider }: Options) {
  surface.dataset.view='explore';document.body.classList.remove('reference-open');
  const local = new LocalReference();
  let view: View = 'explore';
  let result: ReferenceAnalysis | null = null;
  let stack: ReconstructionControlId[] = [];
  let selectedOverlay: Overlay | null = null;
  let previewOverlay: Overlay | null = null;
  let loading = false;
  let disposed = false;
  let request = 0;
  const engine = new ReferenceAnalysisEngine(provider, () => { if(!disposed) render(); });
  const layer = el('section', 'reference-layer'); layer.hidden = true; layer.setAttribute('aria-label', 'Reference image inspection');
  const empty = el('div', 'reference-empty');
  const input = el('input', 'reference-file'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.id = 'reference-file'; input.setAttribute('aria-label', 'Choose reference image');
  const choose = el('label', 'reference-choose', 'CHOOSE FILE ↗'); choose.htmlFor = input.id;
  empty.append(el('span', 'reference-meta', 'REFERENCE ANALYSIS'), el('h2', '', 'Drop an image.'), choose, input, el('span', 'reference-meta', 'JPG · PNG · WEBP / UP TO 10 MB'), el('p', '', import.meta.env.PROD ? 'Inspect an image locally. Analysis is unavailable in this public release.' : 'Find the visual controls inside a reference.'));
  const plane = el('div', 'reference-image-plane'); plane.hidden = true;
  const image = el('img'); image.alt = 'Selected visual reference';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 1000 1000'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('aria-hidden', 'true');
  plane.append(image, svg);
  const badge = el('span', 'reference-fixture-badge', 'DEMO / NOT MODEL ANALYSIS'); badge.hidden = true;
  layer.append(empty, plane, badge); frame.append(layer);
  const panel = el('section', 'reference-panel'); panel.hidden = true; panel.setAttribute('aria-label', 'Reference analysis and reconstruction controls'); surface.after(panel);
  const toolbar = el('div', 'reference-toolbar');
  const referenceButton = button('REFERENCE', () => setView('reference'));
  const demoButton = button('DEMO', () => setView('demo')); demoButton.disabled = true; demoButton.hidden = import.meta.env.PROD;
  const replace = button('REPLACE IMAGE ↗', () => input.click());
  const remove = button('REMOVE IMAGE', reset);
  const metadata = el('span', 'reference-meta');
  const analyzeButton=button('ANALYZE REFERENCE',()=>{void analyze();});
  const cancelButton=button('CANCEL ANALYSIS',()=>{request++;engine.reset();error.textContent=analysisErrors.cancelled;render();});
  toolbar.append(referenceButton, demoButton, metadata, replace, remove, analyzeButton, cancelButton);
  const status = el('p', 'reference-status'); status.setAttribute('role', 'status');
  const error = el('p', 'reference-error'); error.setAttribute('role', 'alert');
  const privacy = el('p', 'reference-note', 'Local to this page. Not saved, uploaded, or attached to experiment evidence.');
  const demoNote = el('p', 'reference-note', 'Demonstrating selected visual controls, not reconstructing or matching the source image.'); demoNote.hidden=true;

  const overlayBar = el('div', 'reference-overlays'); overlayBar.setAttribute('aria-label', 'Analysis overlays');
  const overlayText = el('p', 'reference-note');
  const observations = el('section', 'reference-observations');
  const findings = el('div', 'reference-findings');
  const suggestions = el('section', 'reference-suggestions');
  const stackSection = el('section', 'reference-stack');
  const limitations = el('div', 'reference-limitations');
  panel.append(toolbar, el('p', 'reference-note', 'Experimental reference analysis. Not validated visual intelligence.'), error, status, privacy, demoNote, overlayBar, overlayText, observations, findings, suggestions, stackSection, limitations);
  let fixtureButton:HTMLButtonElement|undefined;
  let exportButton:HTMLButtonElement|undefined;
  if (import.meta.env.DEV) {
    exportButton=button('DEV / EXPORT NORMALIZED JSON',()=>{
      if(!result||result.provenance!=='provider')return;
      const url=URL.createObjectURL(new Blob([JSON.stringify({analysis:result,imageDimensions:local.current?{width:local.current.width,height:local.current.height}:null},null,2)],{type:'application/json'}));
      const download=link(url,'Download normalized result');download.download='reference-analysis.json';download.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    },'reference-fixture-load');panel.append(exportButton);
    const fixture = button('DEV / LOAD DEMO REFERENCE — NOT MODEL ANALYSIS', () => { void loadFixture(); }, 'reference-fixture-load');
    fixtureButton=fixture;panel.append(fixture);
  }
  function setView(next: View) {
    if (next === 'demo' && (!local.current || !stack.length)) return;
    if(next!=='reference'&&engine.state.status==='analyzing'){request++;engine.reset();}
    view = next; surface.dataset.view = next;
    document.body.classList.toggle('reference-open', next !== 'explore');
    layer.hidden = next !== 'reference'; panel.hidden = next === 'explore';
    demoNote.hidden=next!=='demo';overlayBar.hidden=next==='demo';overlayText.hidden=next==='demo';
    referenceButton.setAttribute('aria-pressed', String(next === 'reference'));
    demoButton.setAttribute('aria-pressed', String(next === 'demo'));
    onView(next, stack); resize();
    if(next==='reference'&&engine.state.status==='not-connected')void engine.refreshAvailability();
    if(next==='demo')frame.scrollIntoView({block:'start',behavior:'auto'});
  }
  function resize() {
    if (!local.current) return;
    const rect = layer.getBoundingClientRect();
    const scale = Math.min(rect.width / local.current.width, rect.height / local.current.height);
    plane.style.width = `${local.current.width * scale}px`; plane.style.height = `${local.current.height * scale}px`;
  }
  const observer = new ResizeObserver(resize); observer.observe(layer);
  function renderOverlay() {
    svg.replaceChildren(); overlayText.textContent = '';
    const shownOverlay=previewOverlay??selectedOverlay;
    if (!result || !shownOverlay) return;
    const add = (tag: 'line' | 'circle' | 'rect', attrs: Record<string, number>) => {
      const node = document.createElementNS(svg.namespaceURI, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      svg.append(node);
    };
    const { anchor, negativeSpace, perspectiveLines } = result.overlays;
    if ((shownOverlay === 'anchor' || shownOverlay === 'thirds') && anchor) {
      add('line', { x1: anchor.x * 1000 - 12, y1: anchor.y * 1000, x2: anchor.x * 1000 + 12, y2: anchor.y * 1000 });
      add('line', { x1: anchor.x * 1000, y1: anchor.y * 1000 - 12, x2: anchor.x * 1000, y2: anchor.y * 1000 + 12 });
      overlayText.textContent = `Estimated subject anchor: x ${anchor.x.toFixed(2)}, y ${anchor.y.toFixed(2)} (normalized from top left).`;
    }
    if (shownOverlay === 'thirds') {
      for (const n of [1000/3,2000/3]) { add('line', { x1:n,y1:0,x2:n,y2:1000 }); add('line', { x1:0,y1:n,x2:1000,y2:n }); }
      overlayText.textContent = 'Rule of Thirds guide: vertical and horizontal divisions at one third and two thirds.';
    }
    if (shownOverlay === 'axis') { add('line', { x1:500,y1:0,x2:500,y2:1000 }); overlayText.textContent = 'Center axis at 50% image width. A guide alone does not establish symmetry.'; }
    if (shownOverlay === 'space' && negativeSpace) {
      add('rect', { x:negativeSpace.x*1000,y:negativeSpace.y*1000,width:negativeSpace.width*1000,height:negativeSpace.height*1000 });
      overlayText.textContent = `Estimated low-detail region: x ${negativeSpace.x.toFixed(2)}, y ${negativeSpace.y.toFixed(2)}, width ${negativeSpace.width.toFixed(2)}, height ${negativeSpace.height.toFixed(2)}.`;
    }
    if (shownOverlay === 'perspective' && perspectiveLines?.length) {
      perspectiveLines.forEach(({from,to}) => add('line', { x1:from.x*1000,y1:from.y*1000,x2:to.x*1000,y2:to.y*1000 }));
      overlayText.textContent = 'Structural depth cues: ' + perspectiveLines.map(({from,to}) => `(${from.x.toFixed(2)}, ${from.y.toFixed(2)}) → (${to.x.toFixed(2)}, ${to.y.toFixed(2)})`).join('; ') + '. Not a calibrated camera solution.';
    }
    overlayBar.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.overlay === selectedOverlay)));
  }
  function finding(title: string, value: string, item: Omit<Finding<unknown>, 'value'>, overlay?: Overlay): HTMLElement {
    const section = el('section');
    section.append(el('h3', 'reference-meta', title), el('p', 'reference-finding-value', value), el('p', 'reference-meta', `${item.status.toUpperCase()} / ${item.confidenceState}`));
    const evidence=el('details');evidence.append(el('summary','reference-meta','EVIDENCE'));
    item.evidence.forEach(text => evidence.append(el('p', 'reference-note', text)));
    item.evidenceObservationIds.forEach(id => { const observation=result?.observations.find(entry=>entry.id===id); if(observation)evidence.append(el('p','reference-note',`Observation ${id}: ${observation.statement}`)); });
    evidence.append(el('p', 'reference-source', `Source: ${item.source}`));section.append(evidence);
    if(overlay) {
      const show=()=>{previewOverlay=overlay;renderOverlay();};
      const restore=()=>{previewOverlay=null;renderOverlay();};
      section.addEventListener('pointerenter',show);section.addEventListener('pointerleave',restore);
      section.addEventListener('focusin',show);section.addEventListener('focusout',restore);
    }
    return section;
  }
  function renderStack() {
    stackSection.replaceChildren(el('h3', 'reference-meta', 'REFERENCE STACK'));
    stackSection.append(el('p', 'reference-note', 'A reconstruction intention, not the original capture parameters. One lens at a time. Composition is applied in stack order; later placement takes precedence.'));
    const list = el('ol');
    stack.forEach(id => { const row = el('li'); const removeItem = button('REMOVE', () => { stack = stack.filter(item => item !== id); refreshStack(); }); removeItem.setAttribute('aria-label', `Remove ${nameFor(id)} from stack`); row.append(el('span', '', nameFor(id)), removeItem); list.append(row); });
    stackSection.append(list);
    if (!stack.length) stackSection.append(el('p', 'reference-note', 'Add a suggested control to begin.'));
    const clear = button('CLEAR STACK', () => { stack = []; refreshStack(); }); clear.disabled = !stack.length;
    const apply = button('APPLY TO DEMO ↗', () => setView('demo')); apply.disabled = !stack.length;
    stackSection.append(clear, apply);
    suggestions.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(item => { item.disabled = stack.includes(item.dataset.add as ReconstructionControlId); item.textContent = item.disabled ? 'ADDED' : 'ADD TO STACK'; });
    demoButton.disabled = !stack.length;
  }
  function refreshStack() { renderStack(); if(view === 'demo'){if(stack.length)onView('demo',stack);else setView('reference');} }
  function render() {
    previewOverlay=null;
    const current = local.current;
    empty.hidden = !!current; plane.hidden = !current; replace.hidden = !current; remove.hidden = !current;
    metadata.textContent = current ? `${current.width} × ${current.height} / ${(current.width/current.height).toFixed(2)}:1` : 'IMAGE REFERENCES';
    if(current){image.src=current.url;image.alt=result?.provenance==='development-fixture'?'Authored development sample. Not model analysis.':`Local reference: ${current.name}`;}else image.removeAttribute('src');
    badge.hidden = result?.provenance !== 'development-fixture';
    panel.dataset.providerStatus=engine.state.status;
    const configured=!!provider&&provider.available!==false;
    privacy.textContent=configured?'Analyze Reference sends this image to OpenAI. The app processes it in memory and does not save it as experiment evidence.':'Local to this page. Not saved, uploaded, or attached to experiment evidence.';
    analyzeButton.hidden=!current||result?.provenance==='development-fixture';
    analyzeButton.disabled=!configured||loading||engine.state.status==='analyzing';
    cancelButton.hidden=engine.state.status!=='analyzing';
    if(fixtureButton)fixtureButton.hidden=configured;
    if(exportButton)exportButton.hidden=result?.provenance!=='provider';
    status.textContent = engine.state.status==='analyzing' ? 'Analyzing reference…' : engine.state.status==='error' ? engine.state.error : loading ? 'Reading image…' : result?.provenance === 'development-fixture' ? 'DEMO / NOT MODEL ANALYSIS — authored sample only.' : current && !configured ? (import.meta.env.PROD ? 'ANALYSIS UNAVAILABLE IN THIS PUBLIC RELEASE' : 'ANALYSIS PROVIDER NOT CONNECTED') : current && !result ? 'Ready to analyze. Your image has not been sent.' : result ? 'Reference analysis' : 'Choose an image to begin.';
    observations.replaceChildren();findings.replaceChildren(); suggestions.replaceChildren(); overlayBar.replaceChildren(); limitations.replaceChildren();
    stackSection.hidden = !result;
    if (current && !result && !loading) {
      findings.append(el('p', 'reference-note', 'Dimensions and aspect ratio are measured locally. Composition, lens tendency, framing and perspective have not been analyzed.'));
      findings.append(el('p', 'reference-note', 'CAMERA MOVEMENT / UNAVAILABLE — Camera movement requires temporal evidence.'));
    }
    if(result) {
      observations.append(el('h3','reference-meta','WHAT WE CAN SEE'));
      result.observations.forEach(item=>{const detail=el('details');detail.append(el('summary','reference-note',item.statement),el('p','reference-meta',`OBSERVED / ${item.confidenceState}`));item.evidence.forEach(text=>detail.append(el('p','reference-note',text)));observations.append(detail);});
      findings.append(el('h3','reference-meta reference-section-label','WHAT IT MAY MEAN'));
      result.composition.forEach(item => findings.append(finding('COMPOSITION',nameFor(item.controlId),item,item.status==='unavailable'?undefined:item.controlId==='rule-of-thirds'?'thirds':item.controlId==='negative-space'?'space':'axis')));
      findings.append(finding('LENS TENDENCY', result.lensTendency.value ?? 'Unavailable', result.lensTendency));
      const framing = result.framing.value;
      findings.append(finding('FRAMING', framing ? `${framing.descriptor} · ${framing.anchor ? `anchor ${framing.anchor.x.toFixed(2)}, ${framing.anchor.y.toFixed(2)}` : 'anchor ambiguous'} · ${framing.subjectScale!==null ? `scale ≈ ${Math.round(framing.subjectScale*100)}% of image height` : 'scale unavailable'}` : 'Unavailable', result.framing));
      findings.append(finding('PERSPECTIVE', result.perspective.value ?? 'Unavailable', result.perspective, 'perspective'));
      findings.append(finding('CAMERA MOVEMENT', 'Unavailable from a single still.', result.cameraMovement));
      const overlays: [Overlay,string,boolean][] = [['anchor','SUBJECT ANCHOR',!!result.overlays.anchor],['thirds','THIRDS',true],['axis','CENTER AXIS',true],['space','NEGATIVE SPACE',!!result.overlays.negativeSpace],['perspective','PERSPECTIVE',!!result.overlays.perspectiveLines?.length]];
      overlays.forEach(([id,label,available]) => { if(!available)return; const choice = button(label, () => { selectedOverlay = selectedOverlay === id ? null : id; overlayBar.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed','false')); renderOverlay(); }); choice.dataset.overlay=id; choice.setAttribute('aria-pressed',String(id===selectedOverlay)); overlayBar.append(choice); });
      suggestions.append(el('h3', 'reference-meta', 'CONTROLS YOU COULD USE'),el('p','reference-note','Creative reconstruction suggestions. Lens values do not identify the original focal length. Explore a control to reach its model translations.'));
      result.suggestedControls.forEach(suggestion => { const id=suggestion.controlId; const row=el('div','reference-suggestion');const add=button('ADD TO STACK',()=>{stack=addToStack(stack,id);refreshStack();});add.dataset.add=id;add.setAttribute('aria-label',`Add ${nameFor(id)} to stack`);row.append(el('span','',nameFor(id)+(id.startsWith('lens-')?' · reconstruction suggestion':'')),link(`/library/${id}`,'EXPLORE ↗'),add);suggestions.append(row,el('p','reference-note',`${suggestion.confidenceState} · ${suggestion.reason}`)); });
      result.limitations.forEach(text => limitations.append(el('p','reference-note',text)));
      renderStack();
    }
    demoButton.disabled = !stack.length;
    renderOverlay(); resize();
  }
  async function load(file: File) {
    error.textContent='';
    try { validateImage(file); } catch(cause) { error.textContent=(cause as Error).message; return; }
    const ticket=++request; engine.reset(); loading=true; render();
    try {
      const loaded=await local.load(file,file.name);
      if(!loaded||disposed||ticket!==request)return;
      result=null;stack=[];selectedOverlay=null;setView('reference');render();

    } catch(cause) { if(ticket===request&&!disposed)error.textContent=(cause as Error).message; }
    finally { if(ticket===request&&!disposed){loading=false;render();} }
  }
  async function analyze(){
    if(!local.current||result?.provenance==='development-fixture')return;
    const ticket=++request;error.textContent='';result=null;stack=[];selectedOverlay=null;
    const state=await engine.analyzeReference(local.current);
    if(disposed||ticket!==request)return;
    if(state.status==='completed')result=state.result;
    render();
  }
  async function loadFixture() {
    if(!import.meta.env.DEV||provider?.available===true)return;
    const ticket=++request;engine.reset();loading=true;error.textContent='';render();
    try {
      const fixture=await import('./fixture');
      if(ticket!==request||disposed)return;
      const loaded=await local.load(new Blob([fixture.fixtureSvg],{type:'image/svg+xml'}),'Development sample');
      if(!loaded||ticket!==request||disposed)return;
      result=fixture.fixtureAnalysis;stack=[];selectedOverlay='anchor';setView('reference');
    } catch(cause) { if(ticket===request&&!disposed)error.textContent=(cause as Error).message; }
    finally { if(ticket===request&&!disposed){loading=false;render();} }
  }
  function reset() { request++;engine.reset();local.clear();result=null;stack=[];selectedOverlay=null;loading=false;error.textContent='';input.value='';setView('reference');render(); }
  input.addEventListener('change',()=>{const file=input.files?.[0];input.value='';if(file)void load(file);});
  layer.addEventListener('dragover',event=>{event.preventDefault();layer.dataset.dragging='true';});
  layer.addEventListener('dragleave',event=>{if(!layer.contains(event.relatedTarget as Node))delete layer.dataset.dragging;});
  layer.addEventListener('drop',event=>{event.preventDefault();delete layer.dataset.dragging;const files=event.dataTransfer?.files;if(files?.length!==1){error.textContent='Drop one image at a time.';return;}const file=files[0];if(file)void load(file);});
  render();
  return {
    open:()=>setView('reference'), explore:()=>setView('explore'),
    dispose() { disposed=true;request++;engine.dispose();local.clear();observer.disconnect();image.removeAttribute('src');layer.remove();panel.remove();document.body.classList.remove('reference-open'); },
  };
}

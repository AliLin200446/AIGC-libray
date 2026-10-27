import { importPanel, batchPanel } from './reference-media';
import { archiveShell, pageTitle } from '../library/archive';
import { el, button, link } from '../library/dom';
import { scopes, type FilmReference, type ReviewInput } from '../../server/film-references/types';
import './clip-ingestion.css';
import './film-references.css';
export async function renderFilmReferences(app:HTMLElement) {
 archiveShell(app);document.title='Film references — Framefield';
 const main=el('main','clip-admin film-admin');main.append(pageTitle('CINEMATIC RESEARCH / LOCAL REVIEW','Inspect the reference.','Twelve film candidates. Source-based hypotheses, explicit permissions, and human review.'));
 main.append(el('p','admin-notice','LOCAL PILOT · Publication and AI analysis disabled. Media imports and permitted local processing are explicit actions. Prompts are editable research drafts, not completed motion analyses.'));
 const status=el('p');status.setAttribute('role','status');
 const filter=el('select');filter.setAttribute('aria-label','Review status');for(const s of ['all','candidate','approved','rejected']){const o=el('option','',s.toUpperCase());o.value=s;filter.append(o);}
 const toolbar=el('div','admin-actions');toolbar.append(filter,button('REFRESH',()=>{void refresh();}),link('/clips','CLIP LIBRARY ↗','technical-action'));
 const stats=el('p','technical');const queue=el('section','admin-queue');queue.setAttribute('aria-label','Film review queue');const detail=el('section','admin-detail');detail.dataset.ffNoTrail='';detail.tabIndex=-1;
 main.append(toolbar,batchPanel(refresh,()=>records),status,stats,queue,detail);app.append(main);
 let records:FilmReference[]=[];let gates:Record<string,{processing:boolean;display:boolean}>={};let busy=false;let disposeMedia=()=>{};window.addEventListener('pagehide',()=>disposeMedia());
 const selected=()=>new URL(location.href).searchParams.get('id');
 function select(id:string){history.pushState(null,'',`/admin/references?id=${encodeURIComponent(id)}`);render();detail.focus();}
 window.addEventListener('popstate',render);filter.addEventListener('change',render);
 async function refresh(){try{const r=await fetch('/admin/references/api/queue');const data=await r.json();if(!r.ok)throw Error(data.error);records=data.candidates;gates=data.gates;render();}catch(e){status.textContent=e instanceof Error?e.message:'Queue unavailable.';}}
 function render(){disposeMedia();queue.replaceChildren();detail.replaceChildren();stats.textContent=`${records.length} REFERENCES · ${records.filter(c=>c.status==='approved').length} APPROVED LOCALLY · 0 PUBLISHED · 0 MODEL CALLS`;
 for(const c of records.filter(c=>filter.value==='all'||filter.value===c.status)) {const card=button('',()=>select(c.id),'admin-card');card.dataset.id=c.id;card.setAttribute('aria-pressed',String(selected()===c.id));card.append(el('span','technical',`${c.year} / ${c.status.toUpperCase()}`),el('strong','',c.film),el('span','',c.scene));queue.append(card);}
 if(!queue.children.length)queue.append(el('p','','No references match this status.'));
 const c=records.find(c=>c.id===selected());if(c)show(c);else if(selected())detail.append(el('p','','Reference not found.'));
 }
 function show(c:FilmReference){
 detail.append(el('h2','',c.film),el('p','technical',`${c.status.toUpperCase()} / REVISION ${c.version} / INSUFFICIENT EVIDENCE`),el('p','',`${c.director} · Cinematography: ${c.cinematographers.join(', ')} · ${c.publisher}`));
 const source=link(c.sourceUrl,'OPEN SOURCE ↗','technical-action');source.target='_blank';source.rel='noopener noreferrer';detail.append(source);
 detail.append(el('p','admin-notice',`Display permission: ${gates[c.id]?.display?'documented':'unverified'}. Local editing: ${c.media?.processingPermission?'authorized':'BLOCKED'}. AI analysis: disabled. Embed metadata: ${c.embedMetadataAvailable?'available; playback not verified':'unavailable'}.`));
 const imported=importPanel(c,refresh);detail.append(imported.root);disposeMedia=imported.dispose;
 detail.append(el('h3','','Research evidence'));
 for(const e of c.evidence){const a=link(e.url,'SOURCE / '+new URL(e.url).hostname,'technical-action');a.target='_blank';a.rel='noopener noreferrer';detail.append(a);}
 detail.append(el('p','','No direct visual observations or temporal analysis have been recorded. Technique labels are unverified for the selected excerpt.'));
 for(const l of c.limitations)detail.append(el('p','technical',l));
 function field(label:string,value:string,rows=2){const wrap=el('label','film-field',label);const input=el('textarea');input.rows=rows;input.value=value;input.setAttribute('aria-label',label);wrap.append(input);detail.append(wrap);return input;}
 const title=field('Video title',c.title);const scene=field('Scene description',c.scene);const technique=field('Camera technique hypothesis',c.technique);
 const time=field('Source timestamp in seconds (blank if unverified)',c.timestamp===null?'':String(c.timestamp),1);
 const display=el('select');display.setAttribute('aria-label','Display method');for(const s of ['external-link','platform-embed','local-video']){const o=el('option','',s);o.value=s;o.disabled=(s==='platform-embed'&&!c.embedMetadataAvailable)||(s==='local-video'&&c.media?.mediaType!=='local');display.append(o);}display.value=c.display;const dl=el('label','film-field','Display method');dl.append(display);detail.append(dl);
 detail.append(el('h3','','Prompt draft / requires temporal review'));
 const short=field('Short prompt',c.prompt.short);const detailed=field('Detailed camera prompt',c.prompt.detailed,4);const controls=field('Structured controls JSON',c.prompt.controls,8);const negative=field('Negative constraints',c.prompt.negative);
 const feedback=el('p');feedback.setAttribute('role','status');detail.append(button('COPY DETAILED PROMPT',()=>{void navigator.clipboard.writeText(detailed.value).then(()=>{feedback.textContent='Copied';setTimeout(()=>{if(feedback.textContent==='Copied')feedback.textContent='';},2200);}).catch(()=>{feedback.textContent='Clipboard unavailable. Select and copy the prompt text.';});}));
 const reviewer=field('Reviewer','',1);const notes=field('Review notes','');
 const scope=el('select');scope.setAttribute('aria-label','Permission scope');for(const s of scopes){const labels:Record<string,string>={embed:'embed — external embedding',store:'store — local retention',display:'display — private local playback',download:'download — obtain source file',edit:'edit — trim and transcode',host:'host — public redistribution',thirdPartyAnalysis:'thirdPartyAnalysis — send to AI'};const o=el('option','',labels[s]??s);o.value=s;scope.append(o);}const sl=el('label','film-field','Permission scope');sl.append(scope);detail.append(sl);
 const evidence=field('Permission evidence reference','');const expires=field('Permission expiry (ISO date or timestamp)','',1);
 detail.append(el('p','technical','Record the authorization document or applicable terms and the precise permitted use. An official upload or oEmbed response alone does not authorize downloading, editing, or AI analysis.'));
 const rightsList=el('ul');for(const s of scopes){const g=c.permissions[s];rightsList.append(el('li','',`${s}: ${g?`${g.evidence} · verified by ${g.reviewer} · expires ${g.expiresAt}`:'unverified'}`));}detail.append(rightsList);
 const actions=el('div','admin-actions');
 async function act(action:ReviewInput['action']){if(busy)return;busy=true;actions.querySelectorAll('button').forEach(b=>{b.disabled=true;});
 try{const input:ReviewInput={id:c.id,version:c.version,action,reviewer:reviewer.value,notes:notes.value};
 if(action==='edit')input.patch={title:title.value,scene:scene.value,technique:technique.value,timestamp:time.value.trim()?Number(time.value):null,display:display.value as FilmReference['display'],prompt:{short:short.value,detailed:detailed.value,controls:controls.value,negative:negative.value}};
 if(action==='verify-rights'||action==='revoke-rights'){input.scope=scope.value as typeof scopes[number];input.evidence=evidence.value;input.expiresAt=expires.value;}
 const r=await fetch('/admin/references/api/review',{method:'POST',headers:{'Content-Type':'application/json','X-Framefield-Review':'1'},body:JSON.stringify(input)});const data=await r.json();if(!r.ok)throw Error(data.error);
 status.textContent=`Saved: ${action}. ${action==='edit'?'Previous approval cleared. ':''}Nothing processed or published.`;await refresh();
 }catch(e){feedback.textContent=e instanceof Error?e.message:'Review failed.';}finally{busy=false;actions.querySelectorAll('button').forEach(b=>{b.disabled=false;});}}
 for(const [text,action] of [['SAVE EDITS','edit'],['VERIFY RIGHTS','verify-rights'],['REVOKE RIGHTS','revoke-rights'],['APPROVE','approve'],['REJECT','reject']] as const)actions.append(button(text,()=>{void act(action);}));
 detail.append(actions,feedback,el('h3','','Review history'));const audit=el('ul');for(const a of c.audit)audit.append(el('li','',`${a.at} · ${a.action} · ${a.reviewer} · ${a.notes}`));detail.append(audit);
 }
 await refresh();
}

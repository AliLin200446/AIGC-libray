import { archiveShell, pageTitle } from '../library/archive';
import { el, button, link } from '../library/dom';
import type { Batch, Candidate } from '../../server/clips/types';
import './clip-ingestion.css';
export async function renderClipIngestion(app:HTMLElement) {
  archiveShell(app);document.title='Clip review — Framefield';
  const main=el('main','clip-admin');main.append(pageTitle('CLIP INGESTION / LOCAL REVIEW ONLY','Review the motion.','Inspect sampled evidence, edit the analysis, and make an explicit review decision. Approvals do not publish.'));
  const notice=el('p','admin-notice','MOCK MODE — Original synthetic test media and authored analyses. No provider downloads or model calls. Mock approvals never enter the public library.');
  const mode=el('select');mode.setAttribute('aria-label','Queue mode');for(const value of ['mock','live']){const option=el('option','',value.toUpperCase()+' QUEUE');option.value=value;mode.append(option);}
  const status=el('p');status.setAttribute('role','status');
  const toolbar=el('div','admin-actions');const stats=el('p','technical');
  const queue=el('section','admin-queue');queue.setAttribute('aria-label','Candidate review queue');
  const detail=el('section','admin-detail');detail.dataset.ffNoTrail='';detail.tabIndex=-1;
  let batch:Batch|null=null,selected:string|null=null;
  const endpoint=(path:string)=>`/dev/clip-ingestion/${path}?mode=${mode.value}`;
  async function refresh(){try{const response=await fetch(endpoint('data'));const data=await response.json();if(!response.ok)throw Error(data.error);batch=data.batch;render();}catch(e){status.textContent=e instanceof Error?e.message:'Queue unavailable.';}}
  mode.addEventListener('change',()=>{selected=null;detail.replaceChildren();void refresh();});
  toolbar.append(mode,button('REFRESH QUEUE',()=>{void refresh();}),link('/clips','PUBLIC LIBRARY ↗','technical-action'),link('https://www.pexels.com','LIVE PROVIDER / PEXELS ↗','technical-action'));
  main.append(notice,toolbar,status,stats,queue,detail);app.append(main);
  function media(file:string){return endpoint('media/'+file);}
  function render(){
    notice.textContent=mode.value==='mock'?'MOCK MODE — Original synthetic test media and authored analyses. No provider downloads or model calls. Mock approvals never enter the public library.':'LIVE MODE — Discovery runs only from the explicit server-side command with documented permissions. Approval does not prepare a release or deploy.';
    queue.replaceChildren();detail.replaceChildren();
    if(!batch){stats.textContent='No pilot yet. Run npm run clips:mock for the local test workflow.';return;}
    stats.textContent=`${batch.id} / ${batch.status} · ${batch.candidates.length}/12 candidates · ${batch.candidates.filter(c=>c.status==='approved').length} approved · ${batch.requests} provider requests · ${batch.analysisCalls} model calls`;
    for(const error of batch.errors)queue.append(el('p','admin-notice',error));
    for(const c of batch.candidates){
      const card=button('',()=>{selected=c.id;show(c);detail.focus();},'admin-card');card.dataset.id=c.id;
      if(c.asset){const img=el('img');img.src=media(c.asset.poster);img.alt='';img.loading='lazy';img.width=640;img.height=360;card.append(img);}
      card.append(el('span','technical',`${c.id} / ${c.status.toUpperCase()}`),el('strong','',c.analysis?.title??c.metadata.title),el('span','',c.metadata.creator));queue.append(card);
    }
    if(selected){const c=batch.candidates.find(c=>c.id===selected);if(c)show(c);}
  }
  function show(c:Candidate){
    detail.querySelectorAll('video').forEach(v=>v.pause());detail.replaceChildren();
    const title=el('h2','',c.analysis?.title??c.metadata.title);detail.append(title,el('p','technical',`${c.status} / revision ${c.version} / ${c.analysisProvenance?.kind??'not analyzed'}`));
    if(c.error)detail.append(el('p','admin-notice',c.error));
    if(c.asset){const video=el('video');video.src=media(c.asset.file);video.poster=media(c.asset.poster);video.controls=true;video.preload='none';video.playsInline=true;video.setAttribute('aria-label','Candidate preview');detail.append(video);}
    detail.append(el('p','',`${c.metadata.creator} · ${c.metadata.duration.toFixed(2)}s · ${c.metadata.licenseName}`));
    if(c.metadata.sourceUrl)detail.append(link(c.metadata.sourceUrl,'VIEW ORIGINAL ON PEXELS ↗','technical-action'));
    if(c.metadata.creatorUrl)detail.append(link(c.metadata.creatorUrl,`CREATOR / ${c.metadata.creator} ↗`,'technical-action'));
    detail.append(link(c.metadata.licenseUrl,'LICENSE ↗','technical-action'));
    const frames=el('div','admin-frames');for(const sample of c.samples){const figure=el('figure');const img=el('img');img.src=media(sample.file);img.alt=`${sample.id} at ${sample.seconds} seconds`;img.loading='lazy';img.width=640;img.height=360;figure.append(img,el('figcaption','technical',`${sample.id} / ${sample.seconds}s / WINDOW ${sample.window}`));frames.append(figure);}detail.append(frames);
    if(c.analysis){
      const findings=el('dl','admin-findings');for(const [key,f] of Object.entries(c.analysis.findings)){findings.append(el('dt','',key),el('dd','',`${f.value??'Unavailable'} · ${f.confidence}${f.value?' · UNVERIFIED':''}`));}detail.append(findings);
      detail.append(el('h3','','Structured generation prompt'),el('p','admin-prompt',Object.values(c.analysis.prompt).join(' ')));
      const limitations=el('ul');for(const text of c.analysis.limitations)limitations.append(el('li','',text));detail.append(limitations);
    }
    const editLabel=el('label','','EDIT ANALYSIS / observations, findings, temporal evidence, prompt');
    const editor=el('textarea');editor.value=JSON.stringify(c.analysis,null,2);editor.rows=18;editor.spellcheck=false;editor.setAttribute('aria-label','Analysis JSON');editLabel.append(editor);detail.append(editLabel);
    const reviewer=el('input');reviewer.placeholder='Your name';reviewer.setAttribute('aria-label','Reviewer');
    const notes=el('textarea');notes.rows=3;notes.placeholder='Analysis corrections, alternatives, and usage-permission basis';notes.setAttribute('aria-label','Review notes');
    const rights=el('input');rights.type='checkbox';const rightsLabel=el('label','admin-check');rightsLabel.append(rights,el('span','',mode.value==='mock'?'I reviewed this synthetic test analysis. Approval is local only.':'I reviewed the evidence and verified usage rights, including caching, analysis, and public display.'));
    const feedback=el('p');feedback.setAttribute('role','status');
    const actions=el('div','admin-actions');
    async function act(action:'approve'|'reject'|'edit'){
      actions.querySelectorAll('button').forEach(b=>{b.disabled=true;});
      try{const body={id:c.id,version:c.version,action,reviewer:reviewer.value,notes:notes.value,rightsVerified:rights.checked,...(action==='edit'?{analysis:JSON.parse(editor.value)}:{})};
        const response=await fetch(endpoint('review'),{method:'POST',headers:{'Content-Type':'application/json','X-Framefield-Review':'1'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw Error(data.error);
        status.textContent=action==='approve'?'Approved for local review. No publication or deployment occurred.':action==='edit'?'Edits saved. Any previous approval has been cleared.':'Candidate rejected.';await refresh();
      }catch(e){feedback.textContent=e instanceof Error?e.message:'Review failed.';}finally{actions.querySelectorAll('button').forEach(b=>{b.disabled=false;});}
    }
    const save=button('SAVE EDITS',()=>{void act('edit');});save.disabled=!c.analysis;
    const approve=button('APPROVE',()=>{void act('approve');});approve.disabled=!['ready','approved'].includes(c.status);
    actions.append(save,approve,button('REJECT',()=>{void act('reject');}));
    detail.append(reviewer,notes,rightsLabel,actions,feedback,el('p','technical',`AUDIT / ${c.audit.map(a=>`${a.action} by ${a.reviewer} at ${a.at}`).join(' · ')}`));
  }
  await refresh();
}

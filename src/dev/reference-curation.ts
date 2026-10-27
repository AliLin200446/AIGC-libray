import { controlDatabase } from '../controls/database';
import { controls } from '../controls';
import { contentReady } from '../controls/metadata';
import { ingestUrl, editReference, reviewReference, exportApproved } from '../references/curation';
import { validateReference } from '../references/schema';
import type { RealWorldReference } from '../references/types';
import { el,button,link } from '../library/dom';

const storageKey='framefield-reference-curation-v1';
export function renderReferenceCuration(app:HTMLElement) {
 document.title='Reference curation — development only';
 app.replaceChildren();app.style.cssText='max-width:1000px;margin:30px auto;padding:20px;font:14px/1.6 system-ui';
 const ids=controlDatabase.map(c=>c.id);let records:RealWorldReference[]=[];let unreadable=false;let savedSource='';
 const status=el('p');status.setAttribute('role','status');
 try{savedSource=localStorage.getItem(storageKey)??'[]';const saved=JSON.parse(savedSource);if(!Array.isArray(saved))throw Error('Invalid local store.');records=saved.map(r=>validateReference(r,ids));}catch{unreadable=true;status.textContent='Local data could not be read. Export/recover your saved data before replacing it.';}
 const select=el('select');select.setAttribute('aria-label','Selected control');
 for(const control of controlDatabase){const option=el('option','',`${control.name} / ${control.status}${control.goldPilot?' / GOLD':''}`);option.value=control.id;select.append(option);}select.value='dolly';
 const definition=el('section');const list=el('section');const url=el('input');url.type='url';url.placeholder='https://official-source.example/work';url.setAttribute('aria-label','Source URL');url.style.width='70%';
 const output=el('textarea');output.setAttribute('aria-label','Approved production JSON');output.rows=12;output.style.width='100%';output.readOnly=true;output.hidden=true;
 const reviewer=el('input');reviewer.setAttribute('aria-label','Human reviewer');reviewer.placeholder='Your name';
 const rights=el('input');rights.setAttribute('aria-label','Rights basis');rights.placeholder='Official source / permission or license basis';rights.style.width='55%';
 function save(){if(unreadable)throw Error('Recover the unreadable local store before saving new records.');try{localStorage.setItem(storageKey,JSON.stringify(records));status.textContent='Saved in this browser only. Production is unchanged.';}catch{status.textContent='Browser storage failed. Keep this page open and copy an export before leaving.';}render();}
 function action(fn:()=>void){try{fn();}catch(error){status.textContent=error instanceof Error?error.message:'Invalid metadata.';}}
 const ingest=button('RECORD URL AS CANDIDATE',()=>action(()=>{records.push(ingestUrl(url.value.trim(),[select.value],ids));url.value='';save();}));
 const exportButton=button('EXPORT APPROVED JSON',()=>action(()=>{output.value=exportApproved(records,controls.map(c=>c.id));output.hidden=false;status.textContent='Copy this reviewed JSON into src/references/approved.json through code review. This action does not publish.';}));
 const exportAll=button('BACK UP LOCAL CANDIDATES',()=>{output.value=unreadable?savedSource:JSON.stringify(records,null,2);output.hidden=false;status.textContent='Local backup includes unapproved candidates. Do not copy this backup into the production database.';});
 function render(){
  const control=controlDatabase.find(c=>c.id===select.value)!;definition.replaceChildren(el('h2','','CONTROL DEFINITION'),el('h3','',control.name),el('p','',control.definition??'Taxonomy draft — definition and demonstration have not been authored.'),el('p','',`${control.family} / ${control.status}${control.goldPilot?' / GOLD PILOT':''}`));
  if(control.goldPilot?.configuration)definition.append(el('p','',`Pilot configuration: ${JSON.stringify(control.goldPilot.configuration)}`));
  definition.append(el('p','',`Preferred media: ${control.preferredReferenceMedia.join(', ')}`),el('pre','',JSON.stringify(control.parameterSemantics,null,2)),el('p','',`Content readiness: ${JSON.stringify(control.readiness)}. Full content gate: ${contentReady(control.readiness)?'ready':'incomplete'}. Existing canonical IDs are preserved; canonical does not mean fully populated.`));
  list.replaceChildren(el('h2','','CANDIDATE REFERENCES'));
  for(const reference of records.filter(r=>r.controlIds.includes(select.value))){
   const card=el('article');card.dataset.ffNoTrail='';card.style.cssText='border-top:1px solid var(--ff-rule);padding:18px 0';
   card.append(el('h3','',reference.title),el('p','',`${reference.work||'Work not entered'} / ${reference.creator||'Creator not entered'} / ${reference.medium}`),el('p','',`${reference.sourceType} / ${reference.rightsStatus} / ${reference.verificationStatus}`),el('p','',`Time: ${reference.startTime??'—'} → ${reference.endTime??'—'}`));
   const source=link(reference.sourceUrl,'SOURCE ↗');source.target='_blank';source.rel='noopener noreferrer';card.append(source);
   if(reference.thumbnail){const thumb=link(reference.thumbnail,'THUMBNAIL SOURCE ↗');thumb.target='_blank';thumb.rel='noopener noreferrer';card.append(thumb,button('LOAD THUMBNAIL',()=>{const image=el('img');image.src=reference.thumbnail!;image.alt=reference.title;image.referrerPolicy='no-referrer';image.style.maxWidth='320px';card.append(image);}));}
   card.append(el('p','',`OBSERVE: ${reference.observation||'Required before approval'}`),el('p','',`DEMONSTRATES: ${reference.demonstrates||'Required before approval'}`),el('p','',`NOT TO CONFUSE WITH: ${reference.notToConfuseWith||'Required before approval'}`));
   const editor=el('textarea');editor.setAttribute('aria-label',`Metadata for ${reference.id}`);editor.value=JSON.stringify(reference,null,2);editor.rows=18;editor.style.width='100%';editor.hidden=true;
   const observation=el('textarea');observation.setAttribute('aria-label',`Observation for ${reference.id}`);observation.value=reference.observation;observation.rows=3;observation.style.width='100%';observation.hidden=true;
   const replace=(next:RealWorldReference)=>{records=records.map(r=>r.id===reference.id?next:r);save();};
   const saveMetadata=button('SAVE METADATA',()=>action(()=>{const edited=JSON.parse(editor.value);if(edited.id!==reference.id)throw Error('Reference ID cannot change.');replace(editReference(edited,ids));}));saveMetadata.hidden=true;
   const saveObservation=button('SAVE OBSERVATION',()=>action(()=>replace(editReference({...reference,observation:observation.value},ids))));saveObservation.hidden=true;
   card.append(button('EDIT METADATA',()=>{editor.hidden=false;saveMetadata.hidden=false;}),button('EDIT OBSERVATION',()=>{observation.hidden=false;saveObservation.hidden=false;}),editor,saveMetadata,observation,saveObservation);
   for(const decision of ['reviewed','approved','rejected'] as const)card.append(button(decision==='reviewed'?'MARK HUMAN REVIEWED':decision==='approved'?'APPROVE':'REJECT',()=>action(()=>replace(reviewReference(reference,decision,reviewer.value.trim(),rights.value.trim(),ids)))));
   list.append(card);
  }
  if(!records.some(r=>r.controlIds.includes(select.value)))list.append(el('p','','No candidates. Start with an official source URL.'));
 }
 select.addEventListener('change',render);
 app.append(el('h1','','REFERENCE CURATION / DEVELOPMENT ONLY'),el('p','','Discovered metadata → candidate → human review → approved/rejected → explicit production export. No media download and no automatic publication.'),el('p','','Edits invalidate prior approval. Review the source, evidence and rights before approving. Browser-local drafts are not a shared database; back them up before clearing browser data.'),link('/','← FRAMEFIELD'),select,definition,url,ingest,el('h2','','HUMAN REVIEW'),reviewer,rights,status,list,exportButton,exportAll,output);
 render();
}

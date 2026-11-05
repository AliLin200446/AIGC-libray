import {validateResult} from '../analyze/analyze-model';
import {initialControls} from './controls';
import type {ReferenceMapping} from './mapping';
export function mapAnalyzeHandoff(raw:unknown):ReferenceMapping|null {
 try{
 const h=raw as {result:unknown;movement:string;prompt:string;creativeComposition?:string;creativeFocal?:number};const r=validateResult(h.result);
 if(r.simulated||r.provider!=='NVIDIA NIM'||r.model!=='meta/muse-glimmer-30b'||typeof h.prompt!=='string'||h.prompt.length>6000)return null;
 const controls={...initialControls};
 if(h.movement==='dolly'){controls.movement='dolly';controls.duration=5;}
 if([24,35,50,85].includes(h.creativeFocal??0))controls.focalLength=h.creativeFocal!;
 if((r.cameraControls?.confidence??0)>=3)controls.composition=r.cameraControls!.composition as typeof controls.composition;
 if(['centered','symmetrical','rule-of-thirds','negative-space'].includes(h.creativeComposition??''))controls.composition=h.creativeComposition as typeof controls.composition;
 return {reference:{id:'analyze',title:r.summary,backUrl:'/analyze'},controls,imported:['composition'],notes:['Analyzed with Meta Muse Glimmer 30B via NVIDIA NIM.',...r.readings.map(x=>`${x.label}: ${x.value} (${x.status}, confidence ${x.confidence}/5). ${x.evidence}`),...(r.unmappedProperties??[]),`Selected movement: ${h.movement}. Only static and dolly are supported here; others use static. Lens, travel and duration are creative settings, not measured image properties.`, 'The live workspace prompt describes its supported canonical scene. The original reference prompt is preserved below.',`Reference prompt: ${h.prompt}`]};
 }catch{return null;}
}
export function readAnalyzeHandoff(search:string):ReferenceMapping|null {
 if(new URLSearchParams(search).get('from')!=='analyze')return null;
 try{return mapAnalyzeHandoff(JSON.parse(sessionStorage.getItem('ff:analyze-handoff')??'null'));}catch{return null;}
}

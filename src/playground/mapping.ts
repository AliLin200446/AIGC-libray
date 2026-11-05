import { initialControls,type DemoControls } from './controls';
import type { Finding } from '../library/reference/types';
export interface ReferenceParameters {basis?:'curated';id:string;title:string;backUrl:string;movement?:Finding<string>;composition?:Finding<string>;lens?:Finding<string>;unmapped?:string[]}
export interface ReferenceMapping {reference:ReferenceParameters;controls:DemoControls;notes:string[];imported:(keyof DemoControls)[]}
export function mapReference(reference:ReferenceParameters):ReferenceMapping {
 const controls={...initialControls},notes=[...(reference.unmapped??[])],imported:(keyof DemoControls)[]=[];
 function read(label:string,f?:Finding<string>){if(!f?.value||f.status==='unavailable'){notes.push(`${label}: unavailable; creative default retained.`);return null;}if(['weak evidence','insufficient evidence'].includes(f.confidenceState)){notes.push(`${label}: ${f.value} (${f.status}, ${f.confidenceState}); too uncertain to import.`);return null;}if(!f.evidence.length&&!f.evidenceObservationIds.length){notes.push(`${label}: no supporting evidence; default retained.`);return null;}notes.push(`${label}: ${f.value} · ${f.status} · ${f.confidenceState}.`);return f.value.toLowerCase().trim();}
 const movement=read('Movement',reference.movement);if(movement){if(movement==='static'||movement==='static camera'||movement.startsWith('static-camera interpretation for')){controls.movement='static';imported.push('movement');}else if(['dolly in','dolly-in','forward dolly'].includes(movement)){controls.movement='dolly';imported.push('movement');notes.push('Dolly travel and duration are creative defaults, not recovered measurements.');}else notes.push(`Unsupported movement "${movement}"; default retained.`);}
 const composition=read('Composition',reference.composition);if(composition){const names:Record<string,DemoControls['composition']>={'centered':'centered','centered framing':'centered','symmetrical':'symmetrical','rule-of-thirds':'rule-of-thirds','negative-space':'negative-space'};if(names[composition]){controls.composition=names[composition];imported.push('composition');}else notes.push(`Unsupported composition "${composition}"; default retained.`);}
 const lens=read('Lens',reference.lens);if(lens){const match=/^(24|35|50|85)\s*mm$/.exec(lens);if(match&&reference.lens?.status==='observed'){controls.focalLength=Number(match[1]) as DemoControls['focalLength'];imported.push('focalLength');}else notes.push('Qualitative or inferred lens values do not establish exact focal length; creative 50mm default retained.');}
 notes.push('Unmapped defaults: stationary schematic subject, 1m dolly travel and 6s duration. Angle, shot size, lighting and subject animation are not transferred.');return {reference,controls,notes,imported};
}
export function referenceQuery(search:string):{kind:'film'|'clip';id:string}|null {const p=new URLSearchParams(search);if(p.getAll('film').length+p.getAll('clip').length!==1)return null;const kind=p.has('film')?'film':'clip',id=p.get(kind)!;return(kind==='film'?/^film-discovery-(0[1-9]|1[012])$/:/^[a-z0-9][a-z0-9-]{0,79}$/).test(id)?{kind,id}:null;}
export function createPlaygroundState(mapping:ReferenceMapping|null){let value={...(mapping?.controls??initialControls)};return {get value(){return {...value};},change(patch:Partial<DemoControls>){value={...value,...patch};},resetReference(){value={...(mapping?.controls??initialControls)};},resetDefault(){value={...initialControls};}};}

/** Curator-authored creative choices are not passed through the evidence inference path. */
export function mapCuratedReference(clip: import('../clips/types').ClipReference): ReferenceMapping {
 const study=clip.curated!;
 return {reference:{basis:'curated',id:clip.id,title:`${study.film} / ${study.technique}`,backUrl:`/explore/${clip.id}`},
 controls:{...initialControls,...study.creativeControls},imported:[],
 notes:['Curated Camera Prompt: authored creative starting values, not AI analysis or verified film measurements.',study.unsupported,'Supported authored composition and camera motion are applied. 50mm, 1m travel and 6 seconds are creative defaults. The Compose prompt describes this simplified scene, not the complete curated exercise.']};
}

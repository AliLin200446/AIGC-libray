/** Taxonomy draft: development-only. Names are planning slots, not published content. */
import { controls } from './index';
import { emptyReadiness, preferredMedia, type ControlFamily, type ControlMetadata } from './metadata';
export interface TaxonomyEntry extends ControlMetadata {id:string;name:string;definition?:string}
const groups:readonly [ControlFamily,readonly [string,string][]][] = [
 ['CAMERA_MOVEMENT',[['dolly-out','Dolly Out'],['truck-left','Truck Left'],['truck-right','Truck Right'],['pedestal-up','Pedestal Up'],['pedestal-down','Pedestal Down'],['crane-jib','Crane / Jib']]],
 ['LENS',[['lens-18mm','18mm'],['lens-28mm','28mm'],['lens-135mm','135mm']]],
 ['CAMERA_ORIENTATION',[['eye-level','Eye Level'],['low-angle','Low Angle'],['high-angle','High Angle'],['dutch-angle','Dutch Angle'],['overhead','Overhead'],['ground-level','Ground Level']]],
 ['COMPOSITION',[['leading-lines','Leading Lines'],['frame-within-frame','Frame Within Frame'],['layered-depth','Layered Depth']]],
 ['FRAMING',[['extreme-close-up','Extreme Close-Up'],['close-up','Close-Up'],['medium-close-up','Medium Close-Up'],['medium-shot','Medium'],['medium-long','Medium Long'],['full-shot','Full Shot'],['wide-shot','Wide'],['extreme-wide','Extreme Wide']]],
 ['FOCUS_DEPTH',[['shallow-depth-of-field','Shallow Depth of Field'],['deep-focus','Deep Focus'],['rack-focus','Rack Focus']]],
 ['CAMERA_BEHAVIOR',[['static','Static'],['handheld','Handheld'],['tracking-following','Tracking / Following']]],
 ['SUBJECT_CAMERA_RELATION',[['over-the-shoulder','Over-the-Shoulder'],['frontal','Frontal'],['profile','Profile'],['rear-follow','Rear Follow']]],
];
export const draftControls:readonly TaxonomyEntry[]=groups.flatMap(([family,entries])=>entries.map(([id,name])=>({id,name,family,status:'draft' as const,preferredReferenceMedia:preferredMedia(family),readiness:emptyReadiness(),parameterSemantics:{}})));
export const controlDatabase:readonly TaxonomyEntry[]=[...controls.map(c=>({...c,name:c.goldPilot?.label??c.name,definition:c.shortDescription})),...draftControls];

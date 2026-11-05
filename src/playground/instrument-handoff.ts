import { initialControls, type DemoControls } from './controls';
export function instrumentSettings(focal:unknown,composition:unknown,movement:unknown):DemoControls {
 const value=typeof focal==='number'?focal:Number(focal);
 return {...initialControls,focalLength:Number.isFinite(value)&&value>=24&&value<=85?value:initialControls.focalLength,
 composition:['centered','symmetrical','rule-of-thirds','negative-space'].includes(String(composition))?composition as DemoControls['composition']:initialControls.composition,
 movement:movement==='dolly'?'dolly':'static'};
}
export function shotHref(focal:number,composition:string,movement:string){const c=instrumentSettings(focal,composition,movement);return `/compose/workspace?${new URLSearchParams({shot:'1',from:'instrument',focal:String(c.focalLength),composition:c.composition,movement:c.movement})}`;}
export function readInstrumentHandoff(search:string):DemoControls|null {const p=new URLSearchParams(search);if(p.get('shot')!=='1'||p.get('from')!=='instrument'||p.has('clip')||p.has('film'))return null;return instrumentSettings(p.get('focal'),p.get('composition'),p.get('movement'));}

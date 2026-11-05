import {createDemonstration} from '../library/instrument/scene';
import {overlayLayer} from '../library/components/preview';
import {configuredOverlays} from '../library/components/configure';
import {controls} from './index';
import type {MountStudy} from './control-model';
export const mountControlStudy:MountStudy=(host,def,initial)=>{
 const control=controls.find(c=>c.id===def.slug)!;
 let scene:ReturnType<typeof createDemonstration>;
 try{scene=createDemonstration(host,()=>{},()=>{});}catch{host.textContent='3D preview unavailable. The configuration and control spec remain usable.';return {update(){},dispose(){}};}
 let values={...initial},paused=false,overlay:SVGElement|undefined;
 const update=(next:typeof initial)=>{values={...next};paused=false;scene.setPaused(document.hidden);scene.applyRecipe([{controlId:control.id,parameters:values}]);overlay?.remove();overlay=overlayLayer(configuredOverlays(control,{controlId:control.id,controlRevision:control.revision,parameters:values}));host.append(overlay);};
 const visibility=()=>scene.setPaused(document.hidden||paused);document.addEventListener('visibilitychange',visibility);
 update(values);
 return {update,replay(){paused=false;scene.setPaused(false);update(values);},pause(){paused=!paused;scene.setPaused(paused);},dispose(){document.removeEventListener('visibilitychange',visibility);scene.dispose();}};
};

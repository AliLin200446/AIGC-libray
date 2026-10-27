import { el, button, link } from '../dom';
import { canonicalFocal, canonicalFocals, clampFocal, dragFocal, focalReadout, keyFocal, settleFocal } from './lens';
import { createLensAudio } from './lens-audio';
export function createLensRuler(getValue:()=>number, change:(value:number)=>void, lock:(dragging:boolean)=>void) {
  const root=el('div','lens-instrument');
  const readout=el('div','lens-value',focalReadout(50));
  const unit=el('span','lens-unit','FULL FRAME EQ.');readout.append(unit);
  const slider=el('div','lens-ruler');slider.tabIndex=0;slider.setAttribute('role','slider');slider.setAttribute('aria-label','Focal length');slider.setAttribute('aria-valuemin','24');slider.setAttribute('aria-valuemax','85');slider.setAttribute('aria-orientation','horizontal');
  const scale=el('div','lens-scale');scale.setAttribute('aria-hidden','true');
  for(let mm=24;mm<=85;mm++) {const major=canonicalFocals.some(n=>n===mm);const tick=el('span',`lens-tick${major?' major':mm%5===0?' medium':''}`);tick.style.left=`${(mm-24)*12}px`;if(major)tick.append(el('span','',String(mm)));scale.append(tick);}
  const index=el('span','lens-index lens-indicator');index.setAttribute('aria-hidden','true');slider.append(scale,index);
  const audio=createLensAudio();
  const sound=button('SOUND ON',()=>{const enabled=audio.toggle();sound.textContent=enabled?'SOUND ON':'SOUND OFF';sound.setAttribute('aria-pressed',String(enabled));},'lens-sound');sound.setAttribute('aria-label','Mechanical tick sound');sound.setAttribute('aria-pressed','true');
  const explore=link('/library/lens-50mm','EXPLORE 50MM ↗','lens-explore');
  root.append(readout,slider,sound,explore);
  let pointer:number|undefined;let startX=0;let startValue=50;let latest=50;let tapValue=50;let moved=false;
  const update=(value:number)=>{latest=value;change(value);audio.move(value);};
  slider.addEventListener('pointerdown',event=>{if(pointer!==undefined||event.button!==0)return;pointer=event.pointerId;startX=event.clientX;startValue=getValue();latest=startValue;moved=false;const bounds=slider.getBoundingClientRect();tapValue=clampFocal(Math.round(rendered+(startX-bounds.left-bounds.width/2)/12));slider.setPointerCapture(pointer);slider.focus({preventScroll:true});root.dataset.dragging='true';lock(true);audio.unlock(startValue);});
  slider.addEventListener('pointermove',event=>{if(event.pointerId===pointer){if(Math.abs(event.clientX-startX)>4)moved=true;if(moved)update(dragFocal(startValue,event.clientX-startX));}});
  function end(event:PointerEvent) {if(event.pointerId!==pointer)return;pointer=undefined;root.dataset.dragging='false';if(event.type==='pointerup')update(moved?settleFocal(latest):tapValue);lock(false);}
  slider.addEventListener('pointerup',end);slider.addEventListener('pointercancel',end);slider.addEventListener('lostpointercapture',end);
  slider.addEventListener('keydown',event=>{const value=keyFocal(getValue(),event.key,event.shiftKey);if(value===undefined)return;event.preventDefault();audio.unlock(getValue());update(value);});
  // A tap selects the visible tick; dragging translates the scale. Vertical scrolling remains native.
  let rendered=-1;
  function render(value:number) {if(value===rendered)return;rendered=value;scale.style.transform=`translateX(${-12*(value-24)}px)`;readout.firstChild!.textContent=focalReadout(value);slider.setAttribute('aria-valuenow',value.toFixed(2));slider.setAttribute('aria-valuetext',`${value.toFixed(1)} millimeters, full frame equivalent`);const canonical=canonicalFocal(value);explore.hidden=canonical===undefined;if(canonical!==undefined){explore.href=`/library/lens-${canonical}mm`;explore.textContent=`EXPLORE ${canonical}MM ↗`;}}
  render(50);
  return {root,render,get dragging(){return pointer!==undefined;},dispose(){audio.dispose();}};
}

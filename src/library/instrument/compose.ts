import { el,button } from '../dom';
import { primitiveTypes,objectLimit,type ObjectPatch } from './compose-state';
import type { createDemonstration } from './scene';
export function createComposeUI(frame:HTMLElement,getScene:()=>ReturnType<typeof createDemonstration>|undefined){
 const workspace=el('div','compose-workspace');workspace.dataset.ffNoTrail='';workspace.dataset.ffFamily='composition';frame.before(workspace);workspace.append(frame);
 const tools=el('section','compose-tools');tools.setAttribute('aria-label','Scene tools');tools.hidden=true;
 const panel=el('aside','compose-precision');panel.setAttribute('aria-label','Scene inspector');panel.hidden=true;
 workspace.prepend(tools);workspace.append(panel);
 const viewGroup=el('div','compose-tool-group');viewGroup.dataset.ffFamily='camera';viewGroup.append(el('span','','VIEW /'));
 for(const value of ['world','camera','plan']as const){const b=button(value.toUpperCase(),()=>getScene()?.setView(value));b.dataset.view=value;b.setAttribute('aria-label',`${value} view`);viewGroup.append(b);}
 const modeGroup=el('div','compose-tool-group');
 for(const[mode,key]of [['translate','W'],['rotate','E'],['scale','R']]as const){const b=button(`${mode.toUpperCase()} ${key}`,()=>getScene()?.setTransformMode(mode));b.dataset.mode=mode;b.setAttribute('aria-label',`${mode} transform`);modeGroup.append(b);}
 const space=button('SPACE / WORLD',()=>{const s=getScene();if(s)s.setSpace(s.editorState().space==='world'?'local':'world');});
 const snap=button('SNAP / OFF',()=>{const s=getScene();if(s)s.setSnap(!s.editorState().snap);});
 const undo=button('UNDO',()=>getScene()?.undo()),redo=button('REDO',()=>getScene()?.redo());tools.append(viewGroup,modeGroup,space,snap,undo,redo);
 const palette=el('div','compose-create');palette.append(el('p','','ADD / PRIMITIVE'));
 for(const type of primitiveTypes){const b=button(`+ ${type.toUpperCase()}`,()=>{const s=getScene();s?.setPlacement(s.placementType()===type?null:type);});b.dataset.type=type;b.draggable=true;b.title=`Click then place on ground, or drag into World view`;b.addEventListener('dragstart',event=>{event.dataTransfer?.setData('text/plain',type);getScene()?.setPlacement(type);});b.addEventListener('dragend',()=>getScene()?.setPlacement(null));palette.append(b);}
 const outliner=el('div','compose-outliner'),count=el('p');outliner.setAttribute('aria-label','Scene objects');
 const title=el('h2','','OBJECT / PRECISION'),editor=el('div','compose-values');
 let selected:string|null=null;
 function edit(patch:ObjectPatch){const s=getScene();if(selected==='camera')s?.editCamera(patch);else if(selected)s?.editObject(selected,patch);}
 const fields=new Map<string,HTMLInputElement>();
 for(const [section,keys]of [['POSITION',['x','y','z']],['ROTATION °',['rotationX','rotationY','rotationZ']],['SCALE',['scaleX','scaleY','scaleZ']]]as const){
  const row=el('fieldset','compose-value-row');row.dataset.section=section;row.append(el('legend','',section));
  for(const[key,index]of keys.map((key,index)=>[key,index]as const)){const label=el('label'),input=el('input');input.type='number';input.step=section==='ROTATION °'?'1':'.1';input.setAttribute('aria-label',`${section.split(' ')[0]!.toLowerCase()} ${'XYZ'[index]}`);label.append(el('span','','XYZ'[index]),input);row.append(label);fields.set(key,input);bindCommit(input,()=>{if(input.value!==''&&Number.isFinite(input.valueAsNumber))edit({[key]:input.valueAsNumber});});}
  editor.append(row);
 }
 function bindCommit(input:HTMLInputElement,commit:()=>void){input.addEventListener('change',commit);input.addEventListener('blur',()=>{if(input.value!==input.dataset.saved)commit();});input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();commit();input.blur();}if(event.key==='Escape'){event.preventDefault();event.stopPropagation();input.value=input.dataset.saved??'';input.blur();}});}
 const labelField=el('label','compose-name'),name=el('input');name.maxLength=32;name.setAttribute('aria-label','Object label');labelField.append(el('span','','LABEL'),name);bindCommit(name,()=>edit({label:name.value}));
 const role=el('p','compose-role');
 const cameraFields=el('div','compose-camera-spec'),optics=el('p');
 const target=button('TARGET / SUBJECT LOCK',()=>{const s=getScene();if(s)s.setTargetMode(s.editorState().targetMode==='subject'?'free':'subject');});
 const look=button('LOOK THROUGH CAMERA ↗',()=>getScene()?.setView('camera'));cameraFields.append(optics,target,look);
 const measurements=el('p','compose-measurements');
 const actions=el('div','compose-object-actions');const duplicate=button('DUPLICATE',()=>getScene()?.duplicateObject()),remove=button('DELETE',()=>getScene()?.deleteObject());actions.append(duplicate,remove);
 editor.append(labelField,role,cameraFields,measurements,actions);
 const resets=el('div','compose-resets');resets.append(button('RESET CAMERA',()=>getScene()?.resetCamera()),button('RESET SCENE',()=>getScene()?.resetWorld()));
 const help=el('p','compose-help','Alt + drag or right drag orbit · middle drag pan · wheel zoom. W / E / R transform. ⌘/Ctrl D duplicate · ⌘/Ctrl Z undo · Shift redo. Grid: 1 m / 0.5 m.');help.id='compose-help';
 const status=el('p','compose-status');status.setAttribute('role','status');panel.append(palette,count,outliner,title,editor,resets,status,help);
 const returnWorld=button('RETURN TO WORLD ↗',()=>getScene()?.setView('world'));returnWorld.className='compose-return';tools.append(returnWorld);
 function refresh(){const s=getScene();if(!s)return;const state=s.editorState(),world=s.getWorld(),camera=s.getCamera();selected=s.selectedObject();
  for(const b of viewGroup.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.view===state.view));
  for(const b of modeGroup.querySelectorAll('button')){b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));b.disabled=b.dataset.mode==='scale'&&selected==='camera';}
  space.textContent=`SPACE / ${state.space.toUpperCase()}`;snap.textContent=`SNAP / ${state.snap?'ON':'OFF'}`;snap.setAttribute('aria-pressed',String(state.snap));undo.disabled=!state.canUndo;redo.disabled=!state.canRedo;returnWorld.hidden=state.view!=='camera';
  const entries=[['camera','CAMERA'],...Object.values(world).map(o=>[o.id,o.label])];
  if(outliner.dataset.entries!==JSON.stringify(entries)){outliner.dataset.entries=JSON.stringify(entries);outliner.replaceChildren();for(const[id,label]of entries){const b=button(label!,()=>s.selectObject(id!));b.dataset.object=id;outliner.append(b);}}
  for(const b of outliner.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.object===selected));
  count.textContent=`SCENE / ${Object.keys(world).length+1} OBJECTS`;
  for(const b of palette.querySelectorAll('button')){b.disabled=Object.keys(world).length>=objectLimit;b.setAttribute('aria-pressed',String(b.dataset.type===s.placementType()));}
  editor.hidden=!selected;title.textContent=selected==='camera'?'CAMERA / PRODUCTION':selected?`${world[selected]!.label} / PRECISION`:'SELECT AN OBJECT';
  if(selected){const o=world[selected],isCamera=selected==='camera';const position=isCamera?camera.position:o!.position;const rotation=isCamera?camera.rotation:{x:o!.rotation?.x??0,y:o!.rotationY,z:o!.rotation?.z??0};const scale=o?.scaleXYZ??{x:o?.scale??1,y:o?.scale??1,z:o?.scale??1};
   const values:Record<string,number>={...position,rotationX:rotation.x,rotationY:rotation.y,rotationZ:rotation.z,scaleX:scale.x,scaleY:scale.y,scaleZ:scale.z};
   for(const[key,input]of fields){input.disabled=isCamera&&key.startsWith('scale');input.dataset.saved=values[key]!.toFixed(3);if(document.activeElement!==input)input.value=input.dataset.saved;}
   labelField.hidden=isCamera;name.dataset.saved=o?.label??'';if(document.activeElement!==name)name.value=name.dataset.saved;
   role.textContent=`ROLE / ${isCamera?'PRODUCTION CAMERA':o!.semanticRole==='subject'?'PRIMARY SUBJECT':'OBJECT'}`;
   editor.querySelector<HTMLElement>('[data-section="SCALE"]')!.hidden=isCamera;cameraFields.hidden=!isCamera;optics.textContent=`LENS ${camera.focalLength.toFixed(1)} MM · VERTICAL FOV ${camera.fov.toFixed(1)}°`;target.textContent=`TARGET / ${state.targetMode==='subject'?'SUBJECT LOCK':'FREE'}`;
   measurements.hidden=!isCamera&&selected!=='subject';measurements.textContent=`CAMERA → SUBJECT\nDISTANCE ${camera.distance.toFixed(2)} M\nHEIGHT ${camera.position.y.toFixed(2)} M\nBEARING ${camera.bearing.toFixed(1)}°`;
   duplicate.disabled=isCamera;remove.disabled=isCamera||selected==='subject';
  }
  status.textContent=s.placementType()?`PLACE ${s.placementType()!.toUpperCase()} / click ground · Esc cancel`:state.view==='camera'?'PRODUCTION CAMERA / final frame':state.view==='plan'?'PLAN / top down · drag objects or camera':'WORLD / editor navigation leaves production camera unchanged';
 }
 function keydown(event:KeyboardEvent){if(panel.hidden||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement||(event.target instanceof HTMLElement&&event.target.isContentEditable))return;
  const s=getScene();if(!s)return;const key=event.key.toLowerCase();
  if((event.metaKey||event.ctrlKey)&&['z','d'].includes(key)){event.preventDefault();event.stopPropagation();if(key==='d')s.duplicateObject();else if(event.shiftKey)s.redo();else s.undo();return;}
  if(event.target instanceof Element&&event.target.closest('[role=slider],.discovery-zone'))return;
  if(['w','e','r'].includes(key)){event.preventDefault();s.setTransformMode(key==='w'?'translate':key==='e'?'rotate':'scale');}
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();s.setPlacement(null);s.selectObject(null);}
  if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();s.deleteObject();}
 }
 const viewport=frame.querySelector('.instrument-viewport')!;const frameRefresh=()=>{if(!panel.hidden)refresh();};viewport.addEventListener('compose-frame',frameRefresh);document.addEventListener('keydown',keydown,true);
 return{refresh,setEnabled(value:boolean){tools.hidden=panel.hidden=!value;workspace.classList.toggle('is-editing',value);getScene()?.setCompose(value);refresh();},dispose(){document.removeEventListener('keydown',keydown,true);viewport.removeEventListener('compose-frame',frameRefresh);workspace.before(frame);workspace.remove();}};
}

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { createHistory } from './history';
import { scenePalette } from '../palette';
import { remixPose,remixDuration } from '../../recipes/remix';
import type { RecipeControl,RecipeScene,RecipeCamera } from '../../recipes/types';
import { createComposeState, anchorPoint, worldPose, groundIntersection, groundSnap, clamp, cameraMetrics, objectLimit, type PrimitiveType, type ObjectRole } from './compose-state';
import {
  AmbientLight, BoxGeometry, Color, CylinderGeometry, DirectionalLight,
  Mesh, MeshLambertMaterial, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry,
  WebGLRenderer, Group, Raycaster, Vector2, Vector3, GridHelper, CameraHelper, OrthographicCamera, MOUSE, Euler, Quaternion, EdgesGeometry, LineSegments, LineBasicMaterial,
} from 'three';
import type { ControlId } from '../../controls/types';
import { relativeCameraPose, applyPose, demonstrationPose, demonstrationProgress, interpolationBlend, homePose, projectedAnchor, stackPose, lensPose } from './camera';
import type { ReconstructionControlId } from '../reference/types';

export function createDemonstration(host: HTMLElement, onFrame: (focalLength: number) => void, onSettled: () => void, onSceneChange: () => void = () => {}) {
  const palette=scenePalette(host);
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(palette.field);
  renderer.domElement.setAttribute('aria-label', 'Interactive architectural previsualization: one figure, foreground plinth and courtyard columns.');
  renderer.domElement.setAttribute('role', 'img');
  host.prepend(renderer.domElement);
  const compose=createComposeState();
  const scene = new Scene(); scene.background = new Color(palette.field);
  scene.add(new AmbientLight(palette.day, 2.0));
  const sun = new DirectionalLight(palette.warm, 3); sun.position.set(-4, 8, 6); scene.add(sun);
  const stone = new MeshLambertMaterial({ color: palette.stone });
  const pale = new MeshLambertMaterial({ color: palette.wall });
  const recess = new MeshLambertMaterial({ color: palette.recess });
  const graphite = new MeshLambertMaterial({ color: palette.subject });
  const floorMaterial = new MeshLambertMaterial({ color: palette.ground });
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material = stone) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.position.set(x,y,z); scene.add(mesh); return mesh;
  }
  const ground = new Mesh(new PlaneGeometry(32,40),floorMaterial); ground.rotation.x = -Math.PI/2; scene.add(ground);
  // Two seams establish depth without turning the floor into a grid.
  for (const x of [-1.8,1.8]) box(.008,.006,22,x,.004,-3,stone);
  const objects=new Map<string,Group>();
  const labels=new Map<string,HTMLSpanElement>();
  const outlineMaterial=new LineBasicMaterial({color:palette.jade,transparent:true,opacity:.65});
  function makeObject(type:PrimitiveType,id='') {
    const group=new Group();group.userData.role=id;
    if(type==='subject'){
      const body=new Mesh(new CylinderGeometry(.21,.15,1.4,6),graphite);body.position.y=.7;body.scale.z=.65;
      const head=new Mesh(new SphereGeometry(.145,12,8),graphite);head.position.y=1.56;head.scale.set(.82,1.1,.78);group.add(body,head);
    }else if(type==='block')group.add(box(.65,.46,.8,0,.23,0));
    else if(type==='plane'){
      group.add(box(id==='background'?24:3, id==='background'?5:3.5,.16,0,id==='background'?2.5:1.75,0,pale));
      if(id==='background')group.add(box(2.15,3.5,.06,0,1.75,.12,recess));
    }else{group.add(box(.12,3,.14,-1,1.5,0),box(.12,3,.14,1,1.5,0),box(2.12,.12,.14,0,3,0),box(2.12,.12,.14,0,.06,0));}
    if(id)group.traverse(node=>{if(node instanceof Mesh){const edge=new LineSegments(new EdgesGeometry(node.geometry,40),outlineMaterial);edge.visible=false;node.add(edge);}});
    return group;
  }
  function disposeGroup(group:Group){group.traverse(node=>{if(node instanceof Mesh||node instanceof LineSegments)node.geometry.dispose();});group.removeFromParent();}
  const grid=new GridHelper(32,32,palette.moss,palette.mutedMoss);
  const minorGrid=new GridHelper(32,64,palette.moss,palette.mutedMoss);
  for(const [g,opacity] of [[grid,.28],[minorGrid,.1]] as const){g.position.y=.008;g.material.transparent=true;g.material.opacity=opacity;scene.add(g);}
  const camera=new PerspectiveCamera(40,1.6,.05,100);
  const editorCamera=new PerspectiveCamera(48,1.6,.05,150);editorCamera.position.set(10,8,13);
  const planCamera=new OrthographicCamera(-12,12,10,-10,.05,100);planCamera.position.set(0,30,0);planCamera.up.set(0,0,-1);planCamera.lookAt(0,0,0);
  const navigation=new OrbitControls(editorCamera,renderer.domElement);navigation.target.set(0,1,0);navigation.update();navigation.enabled=false;
  navigation.mouseButtons={LEFT:null as unknown as MOUSE,MIDDLE:MOUSE.PAN,RIGHT:MOUSE.ROTATE};navigation.minDistance=2;navigation.maxDistance=55;navigation.maxPolarAngle=Math.PI*.49;
  const transform=new TransformControls(editorCamera,renderer.domElement);transform.setSize(.85);transform.setColors('#a56e65','#708863','#66849b',palette.jade);scene.add(transform.getHelper());transform.enabled=false;
  const cameraObject=new Group();cameraObject.userData.role='camera';cameraObject.add(box(.5,.32,.5,0,0,.2,graphite),box(.26,.2,.24,0,0,-.14,stone));scene.add(cameraObject);
  // Truncate the display length, retaining the production camera's true projection angles.
  const frustumCamera=camera.clone();frustumCamera.far=5;const frustum=new CameraHelper(frustumCamera);frustum.setColors(new Color(palette.moss),new Color(palette.jade),new Color(palette.moss),new Color(palette.mutedMoss),new Color(palette.moss));scene.add(frustum);
  let view:'world'|'camera'|'plan'='camera',targetMode:'subject'|'free'='subject',framingLock=true,snap=false;
  let roll=0;
  const current=homePose();let targetPose=homePose();applyPose(camera,current);
  let active:ControlId|null=null,manualCamera=false;
  let motionStart=homePose();
  let recipeStack:RecipeControl[]|null=null,recipeCamera:RecipeCamera|null=null,recipeFocal:number|undefined;
  let paused=false,started=performance.now(),previous=started,animation=0,stopped=false,settled=false,width=1,height=1;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionIds=new Set<ControlId>(['pan','tilt','dolly','orbit']);
  const raycaster=new Raycaster(),pointer=new Vector2();
  let placement:PrimitiveType|null=null,ghost:Group|undefined;
  const ghostMaterial=new MeshLambertMaterial({color:palette.jade,transparent:true,opacity:.32,depthWrite:false});
  function snapshot(){return{objects:structuredClone(Object.values(compose.world)),camera:{position:current.position.toArray(),target:current.target.toArray(),focalLength:current.focalLength,roll,targetMode,framingLock}};}
  const history=createHistory<ReturnType<typeof snapshot>>();
  function begin(){freeze();history.begin(snapshot());}
  function commit(){history.commit(snapshot());onSceneChange();}
  function change(action:()=>void){const own=!history.active;if(own)begin();action();syncObjects();if(own)commit();onSceneChange();wake();}
  function restore(data:ReturnType<typeof snapshot>){const selected=compose.selected;compose.restore(data.objects);compose.select(selected);current.position.fromArray(data.camera.position);current.target.fromArray(data.camera.target);current.focalLength=data.camera.focalLength;roll=data.camera.roll;targetMode=data.camera.targetMode;framingLock=data.camera.framingLock;freeze();syncObjects();onSceneChange();wake();}
  function freeze(){recipeStack=null;active=null;targetPose={position:current.position.clone(),target:current.target.clone(),focalLength:current.focalLength};}
  function syncObjects(){
    for(const[id,group]of objects)if(!compose.world[id]){disposeGroup(group);objects.delete(id);labels.get(id)?.remove();labels.delete(id);}
    for(const state of Object.values(compose.world)){
      if(!objects.has(state.id)){const group=makeObject(state.primitiveType,state.id);objects.set(state.id,group);scene.add(group);const label=document.createElement('span');label.className='compose-spatial-label';label.setAttribute('aria-hidden','true');host.append(label);labels.set(state.id,label);}
      const group=objects.get(state.id)!;group.position.copy(state.position);group.scale.copy(state.scaleXYZ??{x:state.scale,y:state.scale,z:state.scale});group.rotation.set((state.rotation?.x??0)*Math.PI/180,state.rotationY*Math.PI/180,(state.rotation?.z??0)*Math.PI/180);
      group.traverse(node=>{if(node instanceof LineSegments)node.visible=compose.enabled&&view!=='camera'&&compose.selected===state.id;});
    }
    const selected=compose.selected==='camera'?cameraObject:objects.get(compose.selected??'');
    if(selected&&compose.enabled&&view!=='camera'){if(compose.selected==='camera'&&transform.mode==='scale')transform.setMode('translate');if(!transform.dragging)transform.attach(selected);transform.enabled=!groundDrag;}else{transform.detach();transform.enabled=false;}
    grid.visible=minorGrid.visible=cameraObject.visible=frustum.visible=compose.enabled&&view!=='camera';
    navigation.enabled=compose.enabled&&view==='world'&&!transform.dragging&&!groundDrag;
    scene.updateMatrixWorld(true);
  }
  function viewCamera(){return view==='world'?editorCamera:view==='plan'?planCamera:camera;}
  function applyCamera(){applyPose(camera,current);camera.rotateZ(roll);camera.updateMatrixWorld();if(!transform.dragging||compose.selected!=='camera'){cameraObject.position.copy(camera.position);cameraObject.quaternion.copy(camera.quaternion);}frustumCamera.position.copy(camera.position);frustumCamera.quaternion.copy(camera.quaternion);frustumCamera.fov=camera.fov;frustumCamera.aspect=camera.aspect;frustumCamera.updateProjectionMatrix();frustumCamera.updateMatrixWorld();frustum.update();}
  function render(now:number){
    animation=0;if(stopped||paused||document.hidden||renderer.getContext().isContextLost())return;
    const dt=Math.min((now-previous)/1000,.05);previous=now;
    const motion=(recipeStack?.some(c=>motionIds.has(c.controlId))??false)||(active!==null&&motionIds.has(active));
    const progress=recipeStack?(reduced.matches?1:Math.min(1,(now-started)/(remixDuration(recipeStack)*1000))):demonstrationProgress(now-started,reduced.matches);
    const target=recipeStack?remixPose(recipeStack,compose.world,progress,recipeCamera,camera.aspect,recipeFocal):motion?(manualCamera||compose.enabled?relativeCameraPose(motionStart,active,progress,anchorPoint(compose.world,'subject')):worldPose(demonstrationPose(active,progress),compose.world)):targetPose;
    const blend=interpolationBlend(dt,reduced.matches);current.position.lerp(target.position,blend);current.target.lerp(target.target,blend);current.focalLength+=(target.focalLength-current.focalLength)*blend;
    applyCamera();renderer.render(scene,viewCamera());onFrame(current.focalLength);
    for(const[id,label]of labels){const point=anchorPoint(compose.world,id).project(viewCamera());label.hidden=!compose.enabled||view==='camera'||point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;label.dataset.selected=String(compose.selected===id);if(!label.hidden){label.style.transform=`translate(${(point.x+1)*width/2+15}px,${(1-point.y)*height/2-18}px)`;label.textContent=compose.world[id]!.label;}}
    const anchor=projectedAnchor(camera,anchorPoint(compose.world,'subject'));
    host.dataset.sceneState=JSON.stringify({...compose.snapshot(),camera:snapshot().camera});host.dataset.viewMode=view;host.dataset.selected=compose.selected??'';host.dataset.framingLock=String(framingLock);host.dataset.editorPosition=editorCamera.position.toArray().join(',');host.dataset.cameraPosition=current.position.toArray().map(n=>n.toFixed(3)).join(',');host.dataset.cameraTarget=current.target.toArray().map(n=>n.toFixed(3)).join(',');host.dataset.focalLength=current.focalLength.toFixed(3);host.dataset.subjectAnchor=`${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`;host.dataset.motionMode=reduced.matches?'reduced':'standard';host.dispatchEvent(new CustomEvent('compose-frame'));
    const remaining=current.position.distanceTo(target.position)+current.target.distanceTo(target.target)+Math.abs(current.focalLength-target.focalLength);
    if(remaining>.0001||(motion&&progress<1))wake();else if(!settled){settled=true;onSettled();}
  }
  function wake(){if(!animation&&!stopped&&!paused)animation=requestAnimationFrame(render);}
  function resize(){const rect=host.getBoundingClientRect();width=rect.width;height=rect.height;if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=editorCamera.aspect=width/height;camera.updateProjectionMatrix();editorCamera.updateProjectionMatrix();planCamera.left=-12*width/height;planCamera.right=12*width/height;planCamera.updateProjectionMatrix();wake();}
  const observer=new ResizeObserver(resize);observer.observe(host);
  function activate(id:ControlId|null){
    recipeStack=null;motionStart={position:current.position.clone(),target:current.target.clone(),focalLength:current.focalLength};
    if((compose.enabled||manualCamera)&&id){
      freeze();active=id;if(id==='pan'||id==='tilt')targetMode='free';
      if(id.startsWith('lens-')){setFocalLength(Number(id.slice(5,-2)));return;}
      if(!motionIds.has(id)){const subject=anchorPoint(compose.world,'subject');targetPose.target.copy(subject);if(id==='rule-of-thirds'||id==='negative-space'){const right=new Vector3(1,0,0).applyQuaternion(camera.quaternion);targetPose.target.addScaledVector(right,id==='rule-of-thirds'?.69:.86);if(id==='rule-of-thirds')targetPose.target.y+=.2;}targetMode='free';}
    }else{manualCamera=false;roll=0;targetPose=worldPose(demonstrationPose(id),compose.world);active=id;}
    started=previous=performance.now();settled=false;wake();
  }
  function selectObject(id:string|null){compose.select(id);syncObjects();onSceneChange();wake();}
  function editObject(id:string,patch:Parameters<typeof compose.edit>[1]){change(()=>{compose.edit(id,patch);if(id==='subject'&&targetMode==='subject'){current.target.copy(anchorPoint(compose.world,'subject'));freeze();}});}
  function editCamera(patch:Parameters<typeof compose.edit>[1]){change(()=>{
    manualCamera=true;for(const axis of ['x','y','z'] as const)if(patch[axis]!==undefined)current.position[axis]=clamp(patch[axis]!,axis==='y'?.1:-14,axis==='y'?12:14);
    const rotationEdit=patch.rotationX!==undefined||patch.rotationY!==undefined||patch.rotationZ!==undefined;
    if(rotationEdit){targetMode='free';applyCamera();const e=camera.rotation.clone();if(patch.rotationX!==undefined)e.x=patch.rotationX*Math.PI/180;if(patch.rotationY!==undefined)e.y=patch.rotationY*Math.PI/180;if(patch.rotationZ!==undefined)e.z=patch.rotationZ*Math.PI/180;setOrientation(new Quaternion().setFromEuler(e));}
    else if(targetMode==='subject')current.target.copy(anchorPoint(compose.world,'subject'));
    else{const delta=current.position.clone().sub(targetPose.position);current.target.add(delta);}freeze();
  });}
  function setOrientation(q:Quaternion){const direction=new Vector3(0,0,-1).applyQuaternion(q);current.target.copy(current.position).addScaledVector(direction,Math.max(1,current.position.distanceTo(anchorPoint(compose.world,'subject'))));const neutral=camera.clone();neutral.position.copy(current.position);neutral.up.set(0,1,0);neutral.lookAt(current.target);const relative=neutral.quaternion.clone().invert().multiply(q);roll=new Euler().setFromQuaternion(relative).z;}
  function setPlacement(type:PrimitiveType|null){if(ghost){disposeGroup(ghost);ghost=undefined;}placement=type&&Object.keys(compose.world).length<objectLimit?type:null;if(placement){if(view==='camera')setView('world');selectObject(null);ghost=makeObject(placement);ghost.traverse(node=>{if(node instanceof Mesh)node.material=ghostMaterial;});ghost.visible=false;scene.add(ghost);}host.dataset.placement=placement??'';onSceneChange();wake();}
  function createObject(type:PrimitiveType,point:{x:number;z:number}){let id:string|null=null;change(()=>{id=compose.create(type,point);});return id;}
  function deleteObject(){if(compose.selected&&compose.selected!=='camera')change(()=>{compose.remove(compose.selected!);});}
  function duplicateObject(){if(compose.selected&&compose.selected!=='camera')change(()=>{compose.duplicate(compose.selected!);});}
  function ray(event:{clientX:number;clientY:number}){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,viewCamera());return raycaster.ray;}
  function hit(event:PointerEvent):ObjectRole|null{ray(event);const hit=raycaster.intersectObjects([...objects.values(),...(view!=='camera'?[cameraObject]:[])],true).find(h=>h.object instanceof Mesh);let node=hit?.object;while(node){if(node.userData.role)return node.userData.role as string;node=node.parent??undefined;}return null;}
  let groundDrag:{id:number;role:string;offset:Vector3}|undefined;
  function down(event:PointerEvent){
    navigation.mouseButtons.LEFT=event.altKey?MOUSE.ROTATE:null as unknown as MOUSE;
    if(!compose.enabled||event.button!==0||event.altKey||transform.axis||transform.dragging)return;
    if(placement){placeAt(event);event.preventDefault();return;}
    const id=hit(event);selectObject(id);if(!id)return;host.focus({preventScroll:true});
    if(view==='plan'||event.pointerType==='touch'){const position=id==='camera'?current.position:new Vector3().copy(compose.world[id]!.position);const point=groundIntersection(ray(event),position.y);if(point){begin();groundDrag={id:event.pointerId,role:id,offset:position.clone().sub(point)};navigation.enabled=false;transform.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);}}
  }
  function previewAt(event:{clientX:number;clientY:number}){if(!ghost)return;const point=groundIntersection(ray(event));ghost.visible=!!point;if(point)ghost.position.set(groundSnap(point.x,!snap),0,groundSnap(point.z,!snap));wake();}
  function placeAt(event:{clientX:number;clientY:number}){const point=groundIntersection(ray(event));if(placement&&point){const type=placement;setPlacement(null);createObject(type,{x:groundSnap(point.x,!snap),z:groundSnap(point.z,!snap)});}}
  function move(event:PointerEvent){if(!compose.enabled)return;if(groundDrag&&groundDrag.id===event.pointerId){const position=groundDrag.role==='camera'?current.position:compose.world[groundDrag.role]!.position;const point=groundIntersection(ray(event),position.y);if(point){point.add(groundDrag.offset);const patch={x:groundSnap(point.x,!snap),z:groundSnap(point.z,!snap)};if(groundDrag.role==='camera')editCamera(patch);else editObject(groundDrag.role,patch);}}else if(placement)previewAt(event);}
  function up(){if(groundDrag){groundDrag=undefined;syncObjects();commit();wake();}}
  // Capture runs before addon handlers so selection and Alt navigation are resolved first.
  renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
  function dragOver(event:DragEvent){if(!compose.enabled||!placement)return;event.preventDefault();previewAt(event);}
  function drop(event:DragEvent){if(!placement)return;event.preventDefault();placeAt(event);}
  renderer.domElement.addEventListener('dragover',dragOver);renderer.domElement.addEventListener('drop',drop);
  transform.addEventListener('mouseDown',()=>{begin();navigation.enabled=false;});
  transform.addEventListener('objectChange',()=>{
    const id=compose.selected;if(!id)return;
    if(id==='camera'){manualCamera=true;current.position.copy(cameraObject.position).clamp(new Vector3(-14,.1,-14),new Vector3(14,12,14));if(transform.mode==='rotate'){targetMode='free';setOrientation(cameraObject.quaternion);}else if(targetMode==='subject')current.target.copy(anchorPoint(compose.world,'subject'));else current.target.add(current.position.clone().sub(targetPose.position));freeze();}
    else{const group=objects.get(id)!;compose.edit(id,{x:group.position.x,y:group.position.y,z:group.position.z,rotationX:group.rotation.x*180/Math.PI,rotationY:group.rotation.y*180/Math.PI,rotationZ:group.rotation.z*180/Math.PI,scaleX:group.scale.x,scaleY:group.scale.y,scaleZ:group.scale.z});if(id==='subject'&&targetMode==='subject'){current.target.copy(anchorPoint(compose.world,'subject'));freeze();}}
    syncObjects();onSceneChange();wake();
  });
  transform.addEventListener('mouseUp',()=>{commit();navigation.enabled=view==='world';});transform.addEventListener('change',wake);navigation.addEventListener('change',wake);
  function setView(value:typeof view){view=value;transform.camera=viewCamera();host.parentElement!.dataset.composeView=value;syncObjects();onSceneChange();wake();}
  function setFocalLength(value:number,preservePlacement=false){const own=!history.active;if(own&&compose.enabled)begin();recipeStack=null;active=null;const focal=clamp(value,24,85);const pose={position:targetPose.position.clone(),target:targetPose.target.clone(),focalLength:focal};if(framingLock){const anchor=anchorPoint(compose.world,'subject');pose.position.sub(anchor).multiplyScalar(focal/targetPose.focalLength).add(anchor);}if(!manualCamera&&!compose.enabled&&framingLock&&!preservePlacement)pose.target.copy(anchorPoint(compose.world,'subject'));targetPose=pose;previous=performance.now();settled=false;if(compose.enabled){current.position.copy(pose.position);current.target.copy(pose.target);current.focalLength=focal;if(own)commit();}wake();}
  function visibility(){previous=performance.now();if(!document.hidden)wake();}function motionPreference(){settled=false;wake();}
  document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motionPreference);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.dataset.contextLost='true';});renderer.domElement.addEventListener('webglcontextrestored',()=>{delete host.dataset.contextLost;wake();});
  syncObjects();resize();
  return{
    activate,selectObject,editObject,editCamera,createObject,deleteObject,duplicateObject,setPlacement,setView,beginTransaction:begin,commitTransaction:commit,
    setCamera(x:number,z:number,height=current.position.y){editCamera({x,z,y:height});},
    setTransformMode(mode:'translate'|'rotate'|'scale'){if(mode==='scale'&&compose.selected==='camera')return;transform.setMode(mode);onSceneChange();wake();},
    setSpace(space:'world'|'local'){transform.setSpace(space);onSceneChange();wake();},
    setSnap(value:boolean){snap=value;transform.setTranslationSnap(value?.25:null);transform.setRotationSnap(value?Math.PI/12:null);transform.setScaleSnap(value?.1:null);onSceneChange();},
    setTargetMode(value:typeof targetMode){change(()=>{targetMode=value;if(value==='subject'){current.target.copy(anchorPoint(compose.world,'subject'));roll=0;}freeze();});},
    setFramingLock(value:boolean){framingLock=value;onSceneChange();wake();},
    undo(){const data=history.undo(snapshot());if(data)restore(data);},redo(){const data=history.redo(snapshot());if(data)restore(data);},
    editorState(){return{view,mode:transform.mode,space:transform.space,snap,targetMode,framingLock,canUndo:history.canUndo,canRedo:history.canRedo};},
    placementType(){return placement;},
    getCamera(){applyCamera();return{position:current.position.clone(),target:current.target.clone(),rotation:{x:camera.rotation.x*180/Math.PI,y:camera.rotation.y*180/Math.PI,z:camera.rotation.z*180/Math.PI},bearing:Math.atan2(anchorPoint(compose.world,'subject').x-current.position.x,current.position.z-anchorPoint(compose.world,'subject').z)*180/Math.PI,focalLength:current.focalLength,fov:camera.fov,aspect:camera.aspect,...cameraMetrics(current.position,current.target,anchorPoint(compose.world,'subject'))};},
    getWorld(){return structuredClone(compose.world);},selectedObject(){return compose.selected;},
    resetCamera(){change(()=>{manualCamera=false;roll=0;targetMode='subject';const pose=worldPose(lensPose(current.focalLength),compose.world);current.position.copy(pose.position);current.target.copy(pose.target);freeze();});},
    resetWorld(){change(()=>{setPlacement(null);compose.reset();if(targetMode==='subject'){current.target.copy(anchorPoint(compose.world,'subject'));freeze();}});},
    setCompose(value:boolean){compose.setEnabled(value);setPlacement(null);view=value?'world':'camera';host.dataset.compose=String(value);host.tabIndex=value?0:-1;host.setAttribute('aria-label','Scene viewport');renderer.domElement.style.touchAction=value?'none':'auto';setView(view);},
    getFocalLength(){return targetPose.focalLength;},setFocalLength,
    applyRecipe(stack:RecipeControl[],snapshot:RecipeScene|null=null,cameraSnapshot:RecipeCamera|null=null,focalOverride?:number){if(snapshot)compose.restore(snapshot.objects);recipeStack=structuredClone(stack);recipeCamera=cameraSnapshot?structuredClone(cameraSnapshot):null;recipeFocal=focalOverride;active=null;manualCamera=!!cameraSnapshot;framingLock=cameraSnapshot?.framingLock??true;targetMode=cameraSnapshot?.targetMode??'subject';roll=cameraSnapshot?.roll??0;targetPose=remixPose(recipeStack,compose.world,1,recipeCamera,camera.aspect,recipeFocal);started=previous=performance.now();settled=false;syncObjects();onSceneChange();wake();},
    applyStack(ids:readonly ReconstructionControlId[]){recipeStack=null;active=null;manualCamera=false;roll=0;targetPose=worldPose(stackPose(ids),compose.world);previous=performance.now();settled=false;wake();},
    setPaused(value:boolean){paused=value;previous=performance.now();if(value){cancelAnimationFrame(animation);animation=0;}else{resize();wake();}},
    dispose(){stopped=true;cancelAnimationFrame(animation);observer.disconnect();document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motionPreference);navigation.dispose();transform.dispose();frustum.dispose();const materials=new Set<MeshLambertMaterial>();scene.traverse(node=>{if(node instanceof Mesh||node instanceof LineSegments){node.geometry.dispose();for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m as MeshLambertMaterial);}});materials.forEach(m=>m.dispose());for(const g of [grid,minorGrid]){g.geometry.dispose();g.material.dispose();}ghostMaterial.dispose();outlineMaterial.dispose();labels.forEach(label=>label.remove());renderer.dispose();renderer.domElement.remove();},
    get subjectAnchor(){return anchorPoint(compose.world,'subject');},
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3,Ray} from 'three';
import {createComposeState,defaultWorld,editAnchor,objectKey,worldPose,anchorPoint,groundIntersection,groundSnap,rotationSnap,cameraPlacement,cameraMetrics,planPoint,worldPoint} from './compose-state';
import {applyPose,homePose,lensPose,demonstrationPose,stackPose,projectedAnchor,interpolationBlend} from './camera';
function edited(){let world=defaultWorld();world=editAnchor(world,'foreground',{z:3.7,label:'TABLE'});world=editAnchor(world,'background',{z:-14,label:'DOORWAY'});world=editAnchor(world,'subject',{x:.7,z:.4,label:'PERSON',scale:1.3});return world;}
function view(world=edited(),mm=50){const camera=new PerspectiveCamera(40,1.6,.05,100);applyPose(camera,worldPose(lensPose(mm),world));return camera;}
test('Compose sessions preserve world and semantic subject',()=>{
 const state=createComposeState();state.select('subject');assert.equal(state.selected,null);state.setEnabled(true);state.select('subject');assert.equal(state.selected,'subject');
 state.edit('subject',{label:'MODEL',y:1,rotationY:32,scale:1.4});assert.equal(state.world.subject!.semanticRole,'subject');assert.equal(state.world.subject!.position.y,1);assert.equal(state.world.subject!.rotationY,32);
 const snapshot=state.snapshot();assert.equal(snapshot.version,1);assert.equal(snapshot.primarySubjectId,'subject');state.setEnabled(false);state.setEnabled(true);assert.deepEqual(state.snapshot(),snapshot);
});
test('create three primitive types, protect subject, enforce eight-object limit and delete',()=>{
 const state=createComposeState();state.setEnabled(true);for(const type of ['block','plane','frame']as const){const id=state.create(type,{x:1.25,z:2.5})!;assert.equal(state.world[id]!.primitiveType,type);assert.equal(state.world[id]!.position.x,1.25);}
 const extra=state.create('subject',{x:0,z:0})!;assert.equal(state.world[extra]!.semanticRole,'spatial');assert.equal(state.remove('subject'),false);
 state.create('block',{x:0,z:0});assert.equal(state.snapshot().objects.length,8);assert.equal(state.create('frame',{x:0,z:0}),null);
 const id=state.snapshot().objects.at(-1)!.id;assert(state.remove(id));assert.equal(state.snapshot().objects.length,7);assert(state.create('frame',{x:0,z:0}));
});
test('ground raycast maps touch and pointer positions to world, misses horizon and bounded floor',()=>{
 const ray=new Ray(new Vector3(2,3,4),new Vector3(0,-1,0));assert.deepEqual(groundIntersection(ray)!.toArray(),[2,0,4]);assert.deepEqual(groundIntersection(ray,1)!.toArray(),[2,1,4]);assert.equal(groundIntersection(new Ray(new Vector3(0,1,0),new Vector3(0,0,-1))),null);assert.equal(groundIntersection(new Ray(new Vector3(99,1,0),new Vector3(0,-1,0))),null);assert.equal(groundSnap(1.31),1.25);assert.equal(groundSnap(1.31,true),1.31);
});
test('bounded move, yaw, scale and labels use one editor without collision resolution',()=>{
 let world=editAnchor(defaultWorld(),'foreground',{x:100,y:100,z:-100,rotationY:-32,scale:99,label:'SUBJECT'});const o=world.foreground!;assert.deepEqual(o.position,{x:14,y:6,z:-14});assert.equal(o.rotationY,328);assert.equal(o.scale,3);assert.equal(o.semanticRole,'spatial');world=editAnchor(world,'foreground',{x:NaN,scale:Infinity});assert.equal(world.foreground!.position.x,14);assert.equal(world.foreground!.scale,3);assert.equal(rotationSnap(44),45);assert.equal(rotationSnap(32),32);
});
test('keyboard ground and rotation shortcuts use consistent deltas',()=>{assert.deepEqual(objectKey('ArrowLeft'),{x:-.25});assert.deepEqual(objectKey('ArrowDown',true),{z:1});assert.deepEqual(objectKey('['),{rotationY:-5});assert.deepEqual(objectKey(']'),{rotationY:5});assert.equal(objectKey('a'),undefined);});
test('plan coordinates, bounded camera drag, height, angle and distance are deterministic',()=>{
 const q=planPoint(2,6);assert.deepEqual(worldPoint(q.x,q.y),{x:2,z:6});const anchor=new Vector3(0,.9,0),pose=cameraPlacement(0,6,.9,anchor);assert.equal(cameraMetrics(pose.position,pose.target,anchor).distance,6);assert.equal(cameraMetrics(pose.position,pose.target,anchor).yaw,0);assert.equal(cameraMetrics(pose.position,pose.target,anchor).pitch,0);assert.equal(cameraPlacement(99,99,99,anchor).position.y,2.5);assert.equal(cameraPlacement(0,0,-99,anchor).position.y,.3);assert(cameraPlacement(0,0,.9,anchor).position.distanceTo(anchor)>=.75);
});
test('default world preserves original optics and positions',()=>{
 for(const mm of [24,35,50,85]){const base=lensPose(mm),pose=worldPose(base,defaultWorld());assert(pose.position.distanceTo(base.position)<1e-9);assert(pose.target.distanceTo(base.target)<1e-9);}
});
test('edited subject stays the lens framing anchor with clearance across 24–85mm',()=>{
 const world=edited();const anchor=anchorPoint(world,'subject');const face=new Vector3(world.subject!.position.x,1.56*world.subject!.scale,world.subject!.position.z);let first:number|undefined;
 for(const mm of [24,35,50,62,85]){const camera=view(world,mm),projected=projectedAnchor(camera,anchor);assert(Math.abs(projected.x-.5)<1e-9);assert(Math.abs(projected.y-.5)<1e-9);const height=projectedAnchor(camera,face).y;if(first===undefined)first=height;else assert(Math.abs(height-first)<1e-9);assert(camera.position.z>world.foreground!.position.z+.4*world.foreground!.scale);assert(Math.abs(camera.getFocalLength()-mm)<1e-9);}
 const near=view(world,24),far=view(world,85);const apparent=(camera:PerspectiveCamera,role:'foreground'|'background')=>{const p=anchorPoint(world,role);return Math.abs(projectedAnchor(camera,p.clone().add(new Vector3(.1,0,0))).x-projectedAnchor(camera,p).x);};
 assert(apparent(near,'foreground')>apparent(far,'foreground'));assert(apparent(far,'background')>apparent(near,'background'));
});
test('Dolly translates, Orbit targets the semantic subject, Pan/Tilt rotate without mutating composed geometry',()=>{
 const world=edited(),snapshot=JSON.stringify(world),home=worldPose(homePose(),world);
 const dolly=worldPose(demonstrationPose('dolly'),world);assert(dolly.position.z<home.position.z);assert.equal(dolly.focalLength,50);
 const orbit=worldPose(demonstrationPose('orbit'),world);assert(orbit.target.equals(anchorPoint(world,'subject')));assert(Math.abs(orbit.position.distanceTo(orbit.target)-home.position.distanceTo(home.target))<1e-9);
 for(const id of ['pan','tilt'] as const)assert(worldPose(demonstrationPose(id),world).position.equals(home.position));assert.equal(JSON.stringify(world),snapshot);
});
test('composition reframes the edited subject; reset and Reference stack preserve world state',()=>{
 const world=edited(),snapshot=JSON.stringify(world);const camera=view(world);applyPose(camera,worldPose(demonstrationPose('rule-of-thirds'),world));const face=new Vector3(world.subject!.position.x,1.56*world.subject!.scale,world.subject!.position.z);const projected=projectedAnchor(camera,face);assert(Math.abs(projected.x-1/3)<.03);assert(Math.abs(projected.y-1/3)<.03);
 for(const id of ['centered','symmetrical','negative-space'] as const)worldPose(demonstrationPose(id),world);
 applyPose(camera,worldPose(homePose(),world));assert.equal(camera.getFocalLength(),50);assert(Math.abs(projectedAnchor(camera,anchorPoint(world,'subject')).x-.5)<1e-9);
 applyPose(camera,worldPose(stackPose(['lens-85mm','rule-of-thirds']),world));assert(Math.abs(camera.getFocalLength()-85)<1e-9);assert.equal(JSON.stringify(world),snapshot);
});
test('Scene Reset restores labels, positions and scale; reduced motion remains functional',()=>{
 const state=createComposeState();state.setEnabled(true);state.edit('background',{z:-14,label:'DOORWAY',scale:1.6});state.select('background');state.reset();assert.deepEqual(state.world,defaultWorld());assert.equal(state.selected,null);assert.equal(state.enabled,true);assert.equal(interpolationBlend(.01,true),1);
});

test('full XYZ transforms preserve semantic roles and use rotated subject anchor',()=>{
 const world=editAnchor(defaultWorld(),'subject',{rotationX:90,rotationZ:0,scaleX:2,scaleY:2,scaleZ:.5});
 assert.equal(world.subject!.semanticRole,'subject');assert.deepEqual(world.subject!.scaleXYZ,{x:2,y:2,z:.5});
 assert(anchorPoint(world,'subject').distanceTo(new Vector3(0,0,1.8))<1e-9);
 const bounded=editAnchor(world,'subject',{scaleX:-1,scaleY:Infinity,scaleZ:8});assert.equal(bounded.subject!.scaleXYZ!.x,.25);assert.equal(bounded.subject!.scaleXYZ!.z,3);
});
test('duplicate creates independent spatial geometry; camera and primary subject stay protected',()=>{
 const state=createComposeState();state.setEnabled(true);state.select('camera');assert.equal(state.selected,'camera');assert.equal(state.duplicate('camera'),null);assert.equal(state.remove('camera'),false);
 const copy=state.duplicate('subject')!;assert.equal(state.world[copy]!.semanticRole,'spatial');assert.equal(state.world[copy]!.primitiveType,'subject');state.edit(copy,{rotationX:45,x:3});assert.equal(state.world.subject!.position.x,0);assert.equal(state.remove('subject'),false);assert.equal(state.remove(copy),true);
});

import {createHistory} from './history';
import {validScene,validCamera} from '../../recipes/model';
test('one drag is one undo transaction; linear history is bounded and clears redo on branch',()=>{
 const h=createHistory<{x:number}>(2);h.begin({x:0});h.begin({x:1});h.begin({x:2});h.commit({x:3});assert.deepEqual(h.undo({x:3}),{x:0});assert.equal(h.canUndo,false);assert.deepEqual(h.redo({x:0}),{x:3});
 h.begin({x:3});h.commit({x:4});h.begin({x:4});h.commit({x:5});assert.deepEqual(h.undo({x:5}),{x:4});assert.deepEqual(h.undo({x:4}),{x:3});assert.equal(h.undo({x:3}),undefined);
 h.begin({x:3});h.commit({x:8});assert.equal(h.canRedo,false);h.begin({x:8});h.commit({x:8});assert.deepEqual(h.undo({x:8}),{x:3});
});
test('Recipe snapshots validate full transforms, spatial subject copies and camera targeting',()=>{
 const state=createComposeState();state.edit('subject',{rotationX:25,scaleZ:2});state.duplicate('subject');assert(validScene(state.snapshot()));
 const camera={position:[2,3,6],target:[0,1,0],focalLength:35,roll:.25,targetMode:'free',framingLock:false};assert(validCamera(camera));assert(!validCamera({...camera,roll:NaN}));assert(!validCamera({...camera,framingLock:'false'}));
 const data=state.snapshot();data.objects[0]!.scaleXYZ={x:1,y:0,z:1};assert(!validScene(data));
});

import {relativeCameraPose} from './camera';
import {remixPose} from '../../recipes/remix';
test('manual camera previews start from edited pose, preserve optics and do not reset geometry',()=>{
 const base={position:new Vector3(3,2,7),target:new Vector3(1,1,0),focalLength:35},subject=new Vector3(1,1,0);
 for(const id of ['pan','tilt','dolly','orbit']as const){const start=relativeCameraPose(base,id,0,subject);assert(start.position.equals(base.position));assert(start.target.equals(base.target));assert.equal(start.focalLength,35);}
 for(const id of ['pan','tilt']as const)assert(relativeCameraPose(base,id,1,subject).position.equals(base.position));
 assert(Math.abs(relativeCameraPose(base,'dolly',1,subject).position.distanceTo(base.position)-1.2)<1e-9);
 const orbit=relativeCameraPose(base,'orbit',1,subject);assert(Math.abs(orbit.position.distanceTo(subject)-base.position.distanceTo(subject))<1e-9);assert(orbit.target.equals(subject));assert(base.position.equals(new Vector3(3,2,7)));
});
test('Recipe framing lock off keeps a saved camera fixed while the lens changes',()=>{
 const camera={position:[2,3,7]as[number,number,number],target:[0,1,0]as[number,number,number],focalLength:50,framingLock:false};
 const free=remixPose([{controlId:'lens-24mm',parameters:{protocol:'matched-framing'}}],defaultWorld(),1,camera);assert.deepEqual(free.position.toArray(),camera.position);assert.equal(free.focalLength,24);
 const locked=remixPose([{controlId:'lens-24mm',parameters:{protocol:'matched-framing'}}],defaultWorld(),1,{...camera,framingLock:true});assert(!locked.position.equals(free.position));
});

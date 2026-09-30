import assert from 'node:assert/strict';
import test from 'node:test';
import { PerspectiveCamera } from 'three';
import { controls } from '../../controls';
import { applyPose, demonstrationPose, demonstrationProgress, interpolationBlend, faceAnchor, homePose, projectedAnchor } from './camera';

function cameraFor(id: Parameters<typeof demonstrationPose>[0]) {
  const camera=new PerspectiveCamera(40,1.6,.05,100);applyPose(camera,demonstrationPose(id));return camera;
}
test('all twelve controls have finite deterministic states and home is centered 50mm',()=>{
  assert.equal(controls.length,12);
  for(const control of controls) {
    const pose=demonstrationPose(control.id);
    assert([...pose.position.toArray(),...pose.target.toArray(),pose.focalLength].every(Number.isFinite));
  }
  const anchor=projectedAnchor(cameraFor(null));assert(Math.abs(anchor.x-.5)<.001&&Math.abs(anchor.y-.5)<.001);
  assert.equal(homePose().focalLength,50);
});
test('pan/tilt rotate at fixed position; dolly translates with fixed optics; orbit keeps radius',()=>{
  const home=homePose();
  for(const id of ['pan','tilt'] as const) {const pose=demonstrationPose(id);assert(pose.position.equals(home.position));assert(!pose.target.equals(home.target));}
  const dolly=demonstrationPose('dolly');assert(dolly.position.z<home.position.z);assert.equal(dolly.focalLength,50);
  assert.equal(cameraFor('dolly').fov,cameraFor(null).fov);
  const orbit=demonstrationPose('orbit');assert(Math.abs(Math.hypot(orbit.position.x,orbit.position.z)-6)<.001);assert(orbit.target.equals(home.target));
});
test('lens controls change real perspective projection while preserving approximate subject scale',()=>{
  for(const mm of [24,35,50,85]) {
    const id=`lens-${mm}mm` as 'lens-24mm'|'lens-35mm'|'lens-50mm'|'lens-85mm';
    const camera=cameraFor(id);assert(Math.abs(camera.getFocalLength()-mm)<.001);
    assert(Math.abs(camera.position.z-6*mm/50)<.001);
    const face=projectedAnchor(camera,faceAnchor);assert(Math.abs(face.y-projectedAnchor(cameraFor(null),faceAnchor).y)<.001);
  }
  assert(cameraFor('lens-24mm').fov>cameraFor('lens-85mm').fov);
});
test('composition face/subject anchors correspond to the displayed guide regions',()=>{
  const thirds=projectedAnchor(cameraFor('rule-of-thirds'),faceAnchor);
  assert(Math.abs(thirds.x-1/3)<.035&&Math.abs(thirds.y-1/3)<.035,JSON.stringify(thirds));
  const negative=projectedAnchor(cameraFor('negative-space'));assert(negative.x>.25&&negative.x<.35);
  const symmetric=projectedAnchor(cameraFor('symmetrical'));assert(Math.abs(symmetric.x-.5)<.001);
});

test('reduced motion selects a stable endpoint immediately; normal demonstrations end rather than loop',()=>{
  assert.equal(demonstrationProgress(0,true),1);
  assert.equal(interpolationBlend(.016,true),1);
  assert.equal(demonstrationProgress(0,false),0);
  assert.equal(demonstrationProgress(2200,false),1);
  assert.equal(demonstrationProgress(100000,false),1);
});

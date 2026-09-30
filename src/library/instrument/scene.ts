import {
  AmbientLight, BoxGeometry, Color, CylinderGeometry, DirectionalLight,
  Mesh, MeshLambertMaterial, PerspectiveCamera, PlaneGeometry, Scene, SphereGeometry,
  WebGLRenderer,
} from 'three';
import type { ControlId } from '../../controls/types';
import { applyPose, demonstrationPose, demonstrationProgress, interpolationBlend, homePose, projectedAnchor, subjectAnchor, stackPose } from './camera';
import type { ReconstructionControlId } from '../reference/types';

export function createDemonstration(host: HTMLElement, onFrame: (focalLength: number) => void, onSettled: () => void) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor('#e2e0d9');
  renderer.domElement.setAttribute('aria-label', 'Interactive architectural previsualization: one figure, foreground plinth and courtyard columns.');
  renderer.domElement.setAttribute('role', 'img');
  host.prepend(renderer.domElement);
  const scene = new Scene(); scene.background = new Color('#e2e0d9');
  scene.add(new AmbientLight(0xffffff, 2.0));
  const sun = new DirectionalLight(0xfff7e9, 3); sun.position.set(-4, 8, 6); scene.add(sun);
  const stone = new MeshLambertMaterial({ color: '#b7b5ab' });
  const pale = new MeshLambertMaterial({ color: '#cfcdc4' });
  const recess = new MeshLambertMaterial({ color: '#90938a' });
  const graphite = new MeshLambertMaterial({ color: '#616962' });
  const floorMaterial = new MeshLambertMaterial({ color: '#c2c1b6' });
  function box(w: number, h: number, d: number, x: number, y: number, z: number, material = stone) {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.position.set(x,y,z); scene.add(mesh); return mesh;
  }
  const ground = new Mesh(new PlaneGeometry(32,40),floorMaterial); ground.rotation.x = -Math.PI/2; scene.add(ground);
  // Two seams establish depth without turning the floor into a grid.
  for (const x of [-1.8,1.8]) box(.008,.006,22,x,.004,-3,stone);
  box(24,5,.4,0,2.5,-8,pale);
  box(2.15,3.5,.06,0,1.75,-7.77,recess);
  for (const x of [-2.3,2.3]) box(.34,3.8,.55,x,1.9,-5,pale);
  // One offset foreground volume is the primary parallax landmark.
  box(.65,.46,.8,-.88,.23,2.0,stone);
  // A single-material human-scale sculpture: no anatomy, clothing or mannequin joints.
  const body = new Mesh(new CylinderGeometry(.21,.15,1.4,6),graphite);
  body.position.y=.7; body.scale.z=.65; scene.add(body);
  const head = new Mesh(new SphereGeometry(.145,12,8),graphite);
  head.position.y=1.56; head.scale.set(.82,1.1,.78); scene.add(head);
  const camera = new PerspectiveCamera(40,1.6,.05,100);
  const current = homePose(); applyPose(camera,current);
  let active: ControlId | null = null;
  let stack: readonly ReconstructionControlId[] | null = null;
  let paused = false;
  let started = performance.now();
  let previous = started;
  let animation = 0;
  let stopped = false;
  let settled = false;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionIds = new Set<ControlId>(['pan','tilt','dolly','orbit']);
  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix(); wake();
  };
  const observer = new ResizeObserver(resize); observer.observe(host);
  function render(now: number) {
    animation = 0;
    if (stopped || paused || document.hidden || renderer.getContext().isContextLost()) return;
    const dt=Math.min((now-previous)/1000,.05); previous=now;
    const motion = active !== null && motionIds.has(active);
    const progress = demonstrationProgress(now-started,reduced.matches);
    const target=stack ? stackPose(stack) : demonstrationPose(active,motion ? progress : 1);
    const blend=interpolationBlend(dt,reduced.matches);
    current.position.lerp(target.position,blend); current.target.lerp(target.target,blend);
    current.focalLength += (target.focalLength-current.focalLength)*blend;
    applyPose(camera,current);
    renderer.render(scene,camera);
    onFrame(current.focalLength);
    // DOM diagnostics describe this deterministic demo only; they are not persisted evidence.
    const anchor=projectedAnchor(camera);
    host.dataset.focalLength=current.focalLength.toFixed(3);
    host.dataset.cameraPosition=current.position.toArray().map(n=>n.toFixed(3)).join(',');
    host.dataset.cameraTarget=current.target.toArray().map(n=>n.toFixed(3)).join(',');
    host.dataset.subjectAnchor=`${anchor.x.toFixed(3)},${anchor.y.toFixed(3)}`;
    host.dataset.motionMode=reduced.matches?'reduced':'standard';
    const remaining=current.position.distanceTo(target.position)+current.target.distanceTo(target.target)+Math.abs(current.focalLength-target.focalLength);
    if (remaining>.0001 || (motion && progress<1)) wake();
    else if (!settled) { settled=true; onSettled(); }
  }
  function wake() { if (!animation && !stopped && !paused) animation=requestAnimationFrame(render); }
  function activate(id: ControlId | null) { stack=null; active=id; started=performance.now(); previous=started; settled=false; wake(); }
  function visibility() { previous=performance.now(); if (!document.hidden) wake(); }
  function motionPreference() { settled=false; wake(); }
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',motionPreference);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault(); host.dataset.contextLost='true';});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{delete host.dataset.contextLost; wake();});
  resize();
  return {
    activate,
    applyStack(ids: readonly ReconstructionControlId[]) { active=null; stack=[...ids]; previous=performance.now(); settled=false; wake(); },
    setPaused(value: boolean) { paused=value; previous=performance.now(); if(value){cancelAnimationFrame(animation);animation=0;}else{resize();wake();} },
    dispose() {
      stopped=true; cancelAnimationFrame(animation); observer.disconnect();
      document.removeEventListener('visibilitychange',visibility); reduced.removeEventListener('change',motionPreference);
      const materials = new Set<MeshLambertMaterial>();
      scene.traverse(object=>{if(object instanceof Mesh) {object.geometry.dispose(); for (const material of Array.isArray(object.material)?object.material:[object.material]) materials.add(material);}});
      materials.forEach(material => material.dispose());
      renderer.dispose(); renderer.domElement.remove();
    },
    subjectAnchor,
  };
}

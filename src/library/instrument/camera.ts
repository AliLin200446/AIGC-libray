import { clampFocal } from './lens';
import { PerspectiveCamera, Vector3 } from 'three';
import type { ControlId } from '../../controls/types';
import type { ReconstructionControlId } from '../reference/types';

/** Deterministic visual vocabulary only. Never written to experiment/evidence records. */
export interface DemonstrationPose {
  position: Vector3;
  target: Vector3;
  focalLength: number;
}
export const subjectAnchor = new Vector3(0, 0.9, 0);
export const faceAnchor = new Vector3(0, 1.56, 0);
export const homePose = (): DemonstrationPose => ({ position: new Vector3(0, .9, 6), target: subjectAnchor.clone(), focalLength: 50 });

export const demonstrationProgress = (elapsedMs: number, reducedMotion: boolean): number => reducedMotion ? 1 : Math.max(0, Math.min(elapsedMs / 2200, 1));
export const interpolationBlend = (deltaSeconds: number, reducedMotion: boolean): number => reducedMotion ? 1 : 1 - Math.exp(-deltaSeconds * 13);

export function lensPose(value: number): DemonstrationPose {
  const pose=homePose(); pose.focalLength=clampFocal(value); pose.position.z=6*pose.focalLength/50; return pose;
}

export function demonstrationPose(id: ControlId | null, progress = 1): DemonstrationPose {
  const pose = homePose();
  const t = Math.max(0, Math.min(1, progress));
  if (!id || id === 'centered' || id === 'lens-50mm') return pose;
  if (id.startsWith('lens-')) {
    const mm = Number(id.slice(5, -2));
    return lensPose(mm);
  }
  if (id === 'pan') pose.target.set(Math.sin(-.16 * t) * 6, .9, 6 - Math.cos(.16 * t) * 6);
  if (id === 'tilt') pose.target.set(0, .9 + Math.sin(.1 * t) * 6, 6 - Math.cos(.1 * t) * 6);
  if (id === 'dolly') pose.position.z = 6 - 1.2 * t;
  if (id === 'orbit') {
    pose.position.set(Math.sin(.38 * t) * 6, .9, Math.cos(.38 * t) * 6);
  }
  // Composition offsets use the view plane; optics and world geometry stay fixed.
  if (id === 'rule-of-thirds') pose.target.set(.69, 1.10, 0);
  if (id === 'negative-space') pose.target.set(.86, .9, 0);
  if (id === 'symmetrical') { pose.position.set(0, .9, 6); pose.target.copy(subjectAnchor); }
  return pose;
}

export function applyPose(camera: PerspectiveCamera, pose: DemonstrationPose): void {
  camera.position.copy(pose.position);
  camera.filmGauge = 36;
  camera.setFocalLength(pose.focalLength);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
}

/** One real lens plus composition intentions in the same fixed world.
 * Thirds supplies vertical placement; negative space supplies horizontal placement.
 * A later centered/symmetrical intention replaces earlier off-center placement.
 */
export function stackPose(ids: readonly ReconstructionControlId[]): DemonstrationPose {
  const lens = [...ids].reverse().find(id => id.startsWith('lens-'));
  const pose = demonstrationPose(lens ?? null);
  for (const id of ids) {
    if (id === 'centered' || id === 'symmetrical') pose.target.copy(subjectAnchor);
    if (id === 'rule-of-thirds') pose.target.set(.69, 1.10, 0);
    if (id === 'negative-space') pose.target.x = .86;
  }
  return pose;
}

export function projectedAnchor(camera: PerspectiveCamera, anchor = subjectAnchor): { x: number; y: number } {
  const point = anchor.clone().project(camera);
  return { x: (point.x + 1) / 2, y: (1 - point.y) / 2 };
}

/** Preview a movement from the operator's current production pose. */
export function relativeCameraPose(base:DemonstrationPose,id:ControlId|null,progress:number,subject:Vector3):DemonstrationPose {
 const pose={position:base.position.clone(),target:base.target.clone(),focalLength:base.focalLength};
 const t=Math.max(0,Math.min(1,progress)),direction=pose.target.clone().sub(pose.position);
 if(id==='pan')pose.target.copy(direction.applyAxisAngle(new Vector3(0,1,0),.16*t).add(pose.position));
 if(id==='tilt'){const right=new Vector3().crossVectors(direction,new Vector3(0,1,0)).normalize();pose.target.copy(direction.applyAxisAngle(right,.1*t).add(pose.position));}
 if(id==='dolly')pose.position.add(direction.normalize().multiplyScalar(1.2*t));
 if(id==='orbit'){pose.position.sub(subject).applyAxisAngle(new Vector3(0,1,0),.38*t).add(subject);pose.target.copy(subject);}
 return pose;
}

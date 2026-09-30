import type { ControlId, ParameterValue } from '../../controls/types';
import type { CompositionOverlay } from '../../visuals/types';

export type StudyId = `study_${ControlId}_v01`;
export type BaselineId = 'baseline_scene_v01';
export type BaselineVariable =
  | 'subject.identity' | 'subject.wardrobe' | 'subject.pose'
  | 'environment.geometry' | 'environment.objects' | 'environment.time'
  | 'light.direction' | 'light.quality' | 'light.exposure'
  | 'camera.position' | 'camera.orientation' | 'camera.lens' | 'camera.sensor'
  | 'camera.aperture' | 'camera.focus' | 'composition.anchor' | 'composition.framing';

export interface BaselineSpecification {
  baselineId: BaselineId;
  status: 'specified';
  referenceAssets: readonly string[];
  scene: string;
  coordinateSystem: string;
  landmarks: readonly { id: string; description: string; positionMeters: readonly [number, number, number] }[];
  locks: Record<BaselineVariable, string>;
  acceptance: readonly string[];
}

export interface StudyManifestEntry {
  controlId: ControlId;
  controlRevision: number;
  studyId: StudyId;
  mediaType: 'image' | 'video';
  baselineId: BaselineId;
  role: 'treatment' | 'reference-arm';
  variableChanged: readonly BaselineVariable[];
  variablesLocked: readonly BaselineVariable[];
  necessaryDependencies: readonly { variable: BaselineVariable; reason: string }[];
  parameterValues: Record<string, ParameterValue>;
  targetBehavior: string;
  successCriteria: readonly string[];
  rejectionCriteria: readonly string[];
  likelyConfounds: readonly string[];
  assetRequirements: readonly string[];
  status: 'specified' | 'baseline-approved' | 'ready' | 'running' | 'evaluated';
  production: {
    startingFrame: string;
    endingFrame: string;
    cameraPath: string;
    movementSpeed: string;
    durationSeconds: number | null;
    anchor: string;
    overlays: readonly CompositionOverlay[];
  };
  comparisonGroupId?: string;
  /** Provider-neutral directions; model-specific wording remains in ModelTranslation. */
  generationHandoff: {
    referenceBaseline: string;
    controlBeingTested: string;
    canonicalIntent: string;
    whatMustChange: string;
    whatMustNotChange: readonly string[];
    generationInstruction: string;
    preservationConstraints: readonly string[];
    outputRequirements: readonly string[];
    evaluationChecklist: readonly string[];
    modelTranslationStatus: 'unassigned';
  };
}

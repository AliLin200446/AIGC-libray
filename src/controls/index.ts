import { cameraControls } from './camera';
import { lensControls } from './lens';
import { compositionControls } from './composition';
import type { ControlSpecification } from './types';

export const controls: readonly ControlSpecification[] = [...cameraControls, ...lensControls, ...compositionControls];

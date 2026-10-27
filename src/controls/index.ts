import { canonicalMetadata, type ControlMetadata } from './metadata';
import { cameraControls } from './camera';
import { lensControls } from './lens';
import { compositionControls } from './composition';
import type { ControlSpecification } from './types';

export const controls: readonly (ControlSpecification & ControlMetadata)[] = [...cameraControls, ...lensControls, ...compositionControls].map(control => ({...control,...canonicalMetadata(control)}));

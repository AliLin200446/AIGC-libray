import type { ControlParameter } from './types';

export const choice = (id: string, name: string, description: string, options: readonly string[], defaultValue: string): ControlParameter =>
  ({ id, name, description, kind: 'choice', options, defaultValue });
export const amount = (id: string, name: string, description: string, unit: string, min: number, max: number, defaultValue: number): ControlParameter =>
  ({ id, name, description, kind: 'number', unit, min, max, defaultValue });
export const toggle = (id: string, name: string, description: string, defaultValue: boolean): ControlParameter =>
  ({ id, name, description, kind: 'boolean', defaultValue });

export const duration = amount('duration', 'Duration', 'Requested motion duration, not an assumed model capability.', 'seconds', 1, 30, 5);
export const speedProfile = choice('speed-profile', 'Speed profile', 'How motion progresses within the selected duration.', ['constant', 'ease-in-out'], 'constant');
export const compositionConditions = [
  'Use the same subject, environment, aspect ratio, lens and lighting in a paired baseline.',
  'Specify the primary subject or visual anchor before assessing placement.',
] as const;
export const sceneInvariants = ['Subject identity', 'Environment identity', 'Lighting', 'Color treatment', 'Aspect ratio'] as const;

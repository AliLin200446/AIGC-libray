import type { BaselineId, StudyId } from './types';

export interface StudyAssetName {
  baselineId: BaselineId;
  studyId: StudyId;
  /** Stable provider-model-version slug; preserve full identity/settings in the sidecar. */
  modelKey: string;
  runNumber: number;
  attemptNumber: number;
  arm: 'baseline' | 'treatment';
  artifact: 'output' | 'poster' | 'metadata';
  extension: 'png' | 'jpg' | 'webp' | 'mp4' | 'webm' | 'json';
}
export function studyAssetName(input: StudyAssetName): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.modelKey)) throw new Error('Use a lowercase provider-model-version slug.');
  for (const n of [input.runNumber, input.attemptNumber]) if (!Number.isSafeInteger(n) || n < 1) throw new Error('Run and attempt must be positive integers.');
  if ((input.artifact === 'metadata') !== (input.extension === 'json')) throw new Error('Only metadata artifacts use JSON.');
  if (input.artifact === 'poster' && ['mp4', 'webm'].includes(input.extension)) throw new Error('Posters must be still images.');
  return `${input.baselineId}__${input.studyId}__${input.modelKey}__run${String(input.runNumber).padStart(2, '0')}__attempt${String(input.attemptNumber).padStart(2, '0')}__${input.arm}__${input.artifact}.${input.extension}`;
}

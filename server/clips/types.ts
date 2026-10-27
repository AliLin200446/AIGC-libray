import type { EvidenceState } from '../../src/library/reference/types';
export const fields = ['cameraMovement','framing','composition','cameraAngle','lens','lighting','subjectMotion','movementSpeed'] as const;
export type Field = typeof fields[number];
export interface Sample { id: string; seconds: number; window: number; file: string }
export interface VideoMetadata {
  provider: 'pexels' | 'mock'; providerId: string; sourceUrl: string; creator: string; creatorUrl: string;
  title: string; thumbnailUrl: string; videoUrl: string; duration: number; width: number; height: number;
  licenseName: string; licenseUrl: string; query: string; retrievedAt: string;
}
export interface Permission {
  provider: 'pexels'; verifiedBy: string; reference: string; verifiedAt: string; expiresAt: string;
  discovery: boolean; cache: boolean; thirdPartyAnalysis: boolean; publicDisplay: boolean;
}
export interface Analysis {
  title: string; description: string;
  observations: { id: string; statement: string; frameIds: string[]; confidence: EvidenceState }[];
  findings: Record<Field, { value: string | null; confidence: EvidenceState; observationIds: string[]; frameIds: string[] }>;
  evidence: { startFrame: string; endFrame: string; cue: 'global translation' | 'parallax' | 'rotational flow' | 'changing perspective' | 'subject-relative movement'; description: string; observationIds: string[] }[];
  prompt: { camera: string; framing: string; subject: string; lighting: string; continuity: string };
  limitations: string[];
}
export interface Candidate {
  id: string; metadata: VideoMetadata; status: 'candidate' | 'ready' | 'failed' | 'duplicate' | 'approved' | 'rejected';
  version: number; analysis: Analysis | null; samples: Sample[];
  asset: { file: string; sha256: string; poster: string; posterSha256: string } | null;
  analysisProvenance: { kind: 'mock' | 'openai'; model: string; requestedAt: string; responseId: string; usage: unknown } | null;
  analysisAttempted: boolean; error: string | null;
  review: { reviewer: string; notes: string; rightsVerified: boolean; reviewedAt: string; digest: string } | null;
  audit: { action: string; at: string; reviewer: string; notes?: string }[];
}
export interface Batch {
  version: 1; id: 'pilot-001'; mode: 'mock' | 'live'; status: 'running' | 'awaiting-review' | 'stopped';
  startedAt: string; candidates: Candidate[]; requests: number; analysisCalls: number; errors: string[];
  permission: Permission | null;
}
export interface ProviderAdapter { discover(query: string): Promise<VideoMetadata[]> }

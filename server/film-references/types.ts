import type { Finding, Observation } from '../../src/library/reference/types';
import type { RealWorldReference } from '../../src/references/types';
export const scopes = ['embed', 'store', 'display', 'download', 'edit', 'host', 'thirdPartyAnalysis'] as const;
export type Scope = typeof scopes[number];
export interface Grant { evidence: string; reviewer: string; verifiedAt: string; expiresAt: string }
export interface FilmReference {
  id: string; version: number; film: string; year: number; director: string; cinematographers: string[];
  title: string; sourceUrl: string; publisher: string; thumbnailUrl: string | null;
  embedUrl: string | null; embedMetadataAvailable: boolean;
  scene: string; technique: string; timestamp: number | null;
  display: 'external-link' | 'platform-embed' | 'local-video';
  media?: ImportedMedia;
  status: RealWorldReference['verificationStatus'];
  prompt: { short: string; detailed: string; controls: string; negative: string };
  promptBasis: 'authored-research-draft'; observations: Observation[]; inferences: Finding<string>[];
  evidence: { kind: string; url: string }[]; limitations: string[];
  permissions: Partial<Record<Scope, Grant>>;
  audit: { action: string; reviewer: string; at: string; notes: string }[];
}
export interface ReviewInput {
  id: string; version: number; action: 'edit' | 'approve' | 'reject' | 'verify-rights' | 'revoke-rights';
  reviewer: string; notes: string; patch?: { title: string; scene: string; technique: string; timestamp: number | null; display: FilmReference['display']; prompt: FilmReference['prompt'] };
  scope?: Scope; evidence?: string; expiresAt?: string;
}

export interface ImportedMedia {
 mediaType:'youtube'|'vimeo'|'local'; sourceUrl:string; embedUrl:string|null; localAssetPath:string|null;
 optimizedPath:string|null; posterPath:string|null; startTime:number; endTime:number|null; duration:number|null;
 attribution:string; rightsEvidence:Partial<Record<Scope,Grant>>; displayPermission:boolean; processingPermission:boolean;
 importStatus:'metadata-only'|'uploaded'|'ready'; sha256:string|null; mimeType:string|null; originalName:string|null;
}
export interface ImportInput {
 id:string;version:number;reviewer:string;notes:string;sourceUrl?:string;attribution?:string;
 storageEvidence?:string;expiresAt?:string;startTime?:number;endTime?:number;
}

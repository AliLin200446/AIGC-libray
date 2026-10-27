import type { ReferenceMedium } from '../controls/metadata';
export const rightsStatuses=['official-embed','official-link','licensed','metadata-only'] as const;
export const verificationStatuses=['candidate','reviewed','approved','rejected'] as const;
export interface RealWorldReference {
 id:string;controlIds:string[];title:string;work:string;creator:string;year?:number;medium:ReferenceMedium;
 sourceType:'official-publisher'|'licensed-collection'|'institution'|'manual-url'|'other';sourceUrl:string;embedUrl?:string;
 startTime?:number;endTime?:number;thumbnail?:string;attribution:string;
 observation:string;demonstrates:string;notToConfuseWith:string;
 rightsStatus:typeof rightsStatuses[number];verificationStatus:typeof verificationStatuses[number];provenanceNotes?:string;
 review?:{reviewer:string;reviewedAt:string;method:'human';rightsBasis:string};
}

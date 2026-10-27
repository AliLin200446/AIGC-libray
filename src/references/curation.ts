import { validateReference } from './schema';
import type { RealWorldReference } from './types';
export function ingestUrl(sourceUrl:string, controlIds:string[], knownIds:readonly string[], id:string=crypto.randomUUID()):RealWorldReference {
 return validateReference({id,controlIds,title:sourceUrl,work:'',creator:'',medium:'other',sourceType:'manual-url',sourceUrl,attribution:'',observation:'',demonstrates:'',notToConfuseWith:'',rightsStatus:'metadata-only',verificationStatus:'candidate'},knownIds);
}
export interface DiscoveryAdapter {discoverReferences(control:{id:string;name:string},query:string):Promise<readonly unknown[]>}
export async function discoverReferences(adapter:DiscoveryAdapter,control:{id:string;name:string},query:string,knownIds:readonly string[]) {
 const found=await adapter.discoverReferences(control,query);
 return found.map(value=>{if(!value||typeof value!=='object')throw Error('Invalid discovery metadata.');return validateReference({...value,verificationStatus:'candidate',review:undefined},knownIds);});
}
export function reviewReference(value:RealWorldReference, decision:'reviewed'|'approved'|'rejected', reviewer:string,rightsBasis:string,knownIds:readonly string[]) {
 return validateReference({...value,verificationStatus:decision,review:{method:'human',reviewer,rightsBasis,reviewedAt:new Date().toISOString()}},knownIds);
}
export function editReference(value:RealWorldReference,knownIds:readonly string[]) {return validateReference({...value,verificationStatus:'candidate',review:undefined},knownIds);}
export function exportApproved(records:readonly RealWorldReference[],knownIds:readonly string[]) {
 const approved=records.filter(r=>r.verificationStatus==='approved').map(r=>validateReference(r,knownIds));
 if(new Set(approved.map(r=>r.id)).size!==approved.length)throw Error('Duplicate reference IDs.');
 return JSON.stringify(approved,null,2);
}

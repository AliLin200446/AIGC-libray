import { referenceMedia } from '../controls/metadata';
import { rightsStatuses, verificationStatuses, type RealWorldReference } from './types';
export function externalUrl(value:unknown):value is string {
 if(typeof value!=='string')return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')&&!/^[\d.]+$/.test(u.hostname)&&!u.hostname.includes(':');}catch{return false;}
}
/** Runtime boundary shared by manual ingest, discovery, imports and public rendering. */
export function validateReference(value:unknown, knownIds:readonly string[]):RealWorldReference {
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Reference must be an object.');
 const r=value as RealWorldReference;
 const allowed=['id','controlIds','title','work','creator','year','medium','sourceType','sourceUrl','embedUrl','startTime','endTime','thumbnail','attribution','observation','demonstrates','notToConfuseWith','rightsStatus','verificationStatus','provenanceNotes','review'];
 if(Object.keys(r).some(k=>!allowed.includes(k)))throw Error('Unknown reference field.');
 for(const key of ['id','title','work','creator','attribution','observation','demonstrates','notToConfuseWith'] as const)if(typeof r[key]!=='string')throw Error(`Invalid ${key}.`);
 if(!r.id.trim()||!r.title.trim())throw Error('ID and title are required.');
 if(!Array.isArray(r.controlIds)||!r.controlIds.length||new Set(r.controlIds).size!==r.controlIds.length||r.controlIds.some(id=>!knownIds.includes(id)))throw Error('Invalid control mapping.');
 if(!referenceMedia.includes(r.medium)||!rightsStatuses.includes(r.rightsStatus)||!verificationStatuses.includes(r.verificationStatus))throw Error('Invalid medium, rights or verification status.');
 if(!['official-publisher','licensed-collection','institution','manual-url','other'].includes(r.sourceType))throw Error('Invalid source type.');
 if(!externalUrl(r.sourceUrl)||(r.embedUrl!==undefined&&!externalUrl(r.embedUrl))||(r.thumbnail!==undefined&&!externalUrl(r.thumbnail)))throw Error('Sources must be external HTTPS URLs; local media is not ingested.');
 if(r.provenanceNotes!==undefined&&typeof r.provenanceNotes!=='string')throw Error('Invalid provenance notes.');
 if(r.year!==undefined&&(!Number.isInteger(r.year)||r.year<1||r.year>9999))throw Error('Invalid year.');
 for(const key of ['startTime','endTime'] as const)if(r[key]!==undefined&&(!Number.isFinite(r[key])||r[key]!<0))throw Error('Invalid timestamp.');
 if(r.endTime!==undefined&&(r.startTime===undefined||r.endTime<=r.startTime))throw Error('End time must follow start time.');
 if(r.embedUrl&&r.rightsStatus!=='official-embed')throw Error('Embeds require official-embed rights.');
 if(r.thumbnail&&r.rightsStatus==='metadata-only')throw Error('Metadata-only references cannot load thumbnails.');
 if(r.review&&(!r.review.reviewer?.trim()||r.review.method!=='human'||!Number.isFinite(Date.parse(r.review.reviewedAt))||!r.review.rightsBasis?.trim()))throw Error('Invalid human review record.');
 if(r.verificationStatus!=='candidate'&&!r.review)throw Error('Review decisions require human provenance.');
 if(r.verificationStatus==='approved'){
  if(!r.review)throw Error('Approval requires an explicit human review record.');
  for(const key of ['work','creator','attribution','observation','demonstrates','notToConfuseWith'] as const)if(!r[key].trim())throw Error(`Approval requires ${key}.`);
 }
 return structuredClone(r);
}
export function publicReferences(records:readonly unknown[], controlId:string, canonicalIds:readonly string[]):RealWorldReference[]{
 return records.flatMap(record=>{try{const r=validateReference(record,canonicalIds);return r.verificationStatus==='approved'&&r.controlIds.includes(controlId)?[r]:[];}catch{return [];}});
}

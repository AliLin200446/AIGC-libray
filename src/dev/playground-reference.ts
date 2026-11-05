import type { FilmReference } from '../../server/film-references/types';
import type { ReferenceParameters } from '../playground/mapping';
export async function loadFilmParameters(id:string):Promise<ReferenceParameters|null>{const response=await fetch('/admin/references/api/queue',{cache:'no-store'});if(!response.ok)throw Error('Private reference queue unavailable.');const data=await response.json();const c:FilmReference|undefined=data.candidates.find((c:FilmReference)=>c.id===id);if(!c)return null;
 const reviewed=!!c.media&&c.mediaReview?.sourceUrl===c.media.sourceUrl&&c.mediaReview.playbackVerified;
 return {id:c.id,title:`${c.film} / ${c.scene}`,backUrl:`/admin/references?id=${c.id}`,...(reviewed&&c.inferences[0]?{movement:c.inferences[0]}:{}),unmapped:[reviewed?'Browser-reviewed inference; physical capture setup remains unverified.':'Film parameters remain unverified; research tags and prompt drafts are not treated as measurements.']};}

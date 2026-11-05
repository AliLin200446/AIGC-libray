export { mockAnalysis } from '../library/reference/simulated-motion';
export { initialControls,demoStack,demoPrompt,restoreDemoControls } from '../playground/controls';
export type { DemoControls } from '../playground/controls';
import type { FilmReference } from '../../server/film-references/types';
import { permittedFilmEmbed } from '../clips/film';
export const demoReferenceId='film-discovery-04';
export function demoEmbed(c:FilmReference,now=Date.now()):string|null {const g=c.permissions.embed,m=c.media;if(c.id!==demoReferenceId||c.display!=='platform-embed'||!m?.embedUrl||!c.embedMetadataAvailable||!g?.evidence.trim()||!g.reviewer.trim()||!(Date.parse(g.expiresAt)>now)||!permittedFilmEmbed(m.sourceUrl,m.embedUrl))return null;const u=new URL(m.embedUrl);u.searchParams.set('start',String(Math.max(0,Math.floor(m.startTime))));if(m.endTime!==null&&Number.isFinite(m.endTime)&&m.endTime>m.startTime)u.searchParams.set('end',String(Math.floor(m.endTime)));return u.href;}


export function currentDemoReview(c:FilmReference){return c.media&&c.mediaReview&&c.mediaReview.sourceUrl===c.media.sourceUrl?c.mediaReview:null;}

/**
 * Registry adapter for the Index (R1).
 * All control copy and statuses come from the canonical registry.
 */
import type { IndexModel, ThumbSpec } from './index-model';
import type { controls } from '../controls';
import type { ControlId } from '../controls/types';
function thumbFor(id:ControlId):ThumbSpec {
 if(id.startsWith('lens-'))return {kind:'lens',focalMm:Number(id.slice(5,-2))};
 if(id==='rule-of-thirds')return {kind:'thirds'};
 return {kind:id} as ThumbSpec;
}

export function toIndexModel(registry:typeof controls):IndexModel {return {
  title: 'Index',
  kicker: 'Index / Vol. 01',
  lede: '12 canonical controls for camera, lens and composition. Inspect the behavior, then configure the intent.',
  steps: [
    { title: 'Explore a reference', body: 'Open a control or a cinematic clip.' },
    { title: 'Review its evidence', body: 'See what is observed, inferred or unknown.' },
    { title: 'Try it in Compose', body: 'Change the camera, copy a synced prompt.' },
  ],
  families: [
    { id: 'camera', no: '01', name: 'Camera movement', description: 'Change the viewpoint through camera rotation or physical translation.' },
    { id: 'lens', no: '02', name: 'Lens', description: 'Focal length, field of view, and how viewpoint relates to framing. Angles are horizontal, full-frame 36 mm.' },
    { id: 'composition', no: '03', name: 'Composition', description: 'Organize the subject, visual anchors and spatial balance within the frame.' },
  ],
  controls: registry.map((c,i)=>({id:`C-${String(i+1).padStart(2,"0")}`,slug:c.id,family:c.category,title:c.name,behavior:c.shortDescription,status:c.status,experiments:c.experimentStatus,thumb:thumbFor(c.id)})),
  about: [
    'Built with TypeScript, Vite and Three.js for the Meta Global AI Developer Hackathon 2026. Muse analysis is simulated while API key creation and media-processing permission remain blocked. Simulated results are never claims about the source footage.',
    'Creative lens and movement defaults are not recovered physical capture settings. Missing media remain placeholders; source attribution and independent rights checks govern playback and publication.',
  ],
  hrefFor: (c) => `/library/${c.slug}`,
};}

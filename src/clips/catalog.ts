import { originalClips } from './originals';
import { mergeCuratedCatalog } from './curated';
import films from '../references/film-publication.json';
import { filmClips } from './film';
import approved from 'virtual:framefield-clips';
import { clips as briefs } from './data';
/** Release preparation is explicit; candidate queues never enter this module. */
export const clips = mergeCuratedCatalog([...originalClips, ...briefs, ...approved, ...filmClips(films)]);

import approved from 'virtual:framefield-clips';
import { clips as briefs } from './data';
/** Release preparation is explicit; candidate queues never enter this module. */
export const clips = [...briefs, ...approved];

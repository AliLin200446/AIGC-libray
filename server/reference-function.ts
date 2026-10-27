import { createPublicReferenceHandler } from './public-reference';
import { serverConfig } from './openai';
// Node runtime: the existing adapter owns decoding, structured output and validation.
const handler = createPublicReferenceHandler(serverConfig(process.env));
export default { fetch: handler };

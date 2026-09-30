export const analysisErrors = {
  missing_key:'Analysis provider unavailable. Configure the server-side OpenAI key.',
  missing_image:'Choose an image before analyzing.',
  unsupported_image:'Choose a valid, non-animated JPEG, PNG or WEBP image.',
  image_too_large:'Choose an image under 10 MB and no more than 20 megapixels.',
  invalid_request:'The analysis request was not accepted. Reload and try again.',
  timeout:'Analysis timed out. Please try again.',
  rate_limit:'Analysis is temporarily rate-limited. Please wait before trying again.',
  provider_request:'The provider could not process this request. Check server configuration or try another image.',
  provider_refusal:'The provider declined to analyze this image. Try another reference.',
  malformed_output:'The provider returned an incomplete or unreadable result. Please try again.',
  schema_validation:'The analysis did not match the required structure. No suggestions were accepted.',
  consistency_check:'The analysis did not meet the evidence safeguards. No suggestions were accepted.',
  cancelled:'Analysis cancelled. Your image remains local until you analyze again.',
  server_unavailable:'The analysis server is unavailable. Start the application server and retry.',
} as const;
export type AnalysisErrorCode = keyof typeof analysisErrors;
export class ReferenceRequestError extends Error {
  constructor(public code:AnalysisErrorCode){super(analysisErrors[code]);this.name='ReferenceRequestError';}
}
export const MAX_REFERENCE_BYTES=10*1024*1024;
export const MAX_REFERENCE_PIXELS=20_000_000;

export const analysisErrors = {
  missing_key:'Analysis is currently unavailable. Your image is still available for local inspection.',
  analysis_image_too_large:'Analysis accepts images up to 4 MB. Choose a smaller file; your current reference remains available.',
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
  cancelled:'Analysis cancelled. Your reference is still available for inspection.',
  server_unavailable:'Analysis is currently unavailable. Please try again later.',
} as const;
export type AnalysisErrorCode = keyof typeof analysisErrors;
export class ReferenceRequestError extends Error {
  constructor(public code:AnalysisErrorCode){super(analysisErrors[code]);this.name='ReferenceRequestError';}
}
export const MAX_REFERENCE_BYTES=10*1024*1024;
export const MAX_REFERENCE_PIXELS=20_000_000;

// Below Vercel’s 4.5 MB request ceiling; the existing local inspection limit stays unchanged.
export const PUBLIC_ANALYSIS_BYTES=4*1024*1024;

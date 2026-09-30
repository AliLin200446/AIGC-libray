export const failureTaxonomy = {
  'hallucinated-precision': 'A claim is more precise than visible evidence permits.',
  'exact-focal-length-overclaim': 'Claims the capture used an exact focal length; a reconstruction lens suggestion alone is not this failure.',
  'dof-lens-shortcut': 'Infers lens tendency primarily from shallow depth of field.',
  'aesthetic-lens-shortcut': 'Infers lens tendency from mood or aesthetic alone.',
  'motion-from-still': 'Claims camera movement from a single still image.',
  'unsupported-composition': 'Composition claim lacks visible support.',
  'missed-composition': 'A useful visible composition was missed.',
  'overconfident-inference': 'Confidence exceeds the visible support.',
  'underconfident-inference': 'Confidence understates clear visible support.',
  'evidence-inference-mismatch': 'Cited observations do not support the interpretation.',
  'invalid-control-mapping': 'Suggested reconstruction control is unsupported or inappropriate.',
  'missed-useful-control': 'A useful supported reconstruction control was omitted.',
  'spatial-overlay-mismatch': 'Region or line does not ground the associated observation.',
  'subject-anchor-error': 'Subject anchor is misplaced.',
  'crop-history-confound': 'Unknown cropping is treated as known optical evidence.',
  'ambiguous-image-overinterpretation': 'Ambiguous structure is given a definite interpretation.',
} as const;
export type FailureId = keyof typeof failureTaxonomy;

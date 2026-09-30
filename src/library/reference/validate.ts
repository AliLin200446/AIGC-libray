import { controls } from '../../controls';
import { AnalysisValidationError, referenceAnalysisSchema, validateSchema } from './schema';
import type { AnalysisContent, ProviderMetadata, ReferenceAnalysis } from './types';

export const requiredLimitations = [
  'Exact focal length cannot be recovered from image appearance alone.',
  'Camera movement requires temporal evidence and is unavailable from a still image.',
  'Subject distance, sensor size and crop history are unknown.',
  'Cropping and post-processing may affect apparent framing and spatial relationships.',
];
const lensMapping: Record<string, string[]> = {
  'wide-like':['lens-24mm','lens-35mm'], 'normal-like':['lens-35mm','lens-50mm'],
  'telephoto-like':['lens-50mm','lens-85mm'], insufficient:[],
};
/** Free text is not a metadata channel. Numeric optical specifications belong only in canonical IDs.
 * These conservative checks reject common capture claims, not every possible natural-language paraphrase.
 */
function validateProse(text:string):void {
  const numericOptics=/\b(?:\d+(?:[.,]\d+)?|twenty[- ]four|thirty[- ]five|fifty|eighty[- ]five)\s*(?:mm|millimet(?:er|re)s?)\b/i;
  const recoveredOptics=/\b(?:focal length|lens)\s+(?:was|is|equals?|used|of)\s+(?:exactly\s+)?(?:\d|twenty|thirty|fifty|eighty)/i;
  const motionClaim=/\b(?:camera|photographer)\s+(?:(?:is|was|has been)\s+)?(?:pann(?:ed|ing)|tilt(?:ed|ing)|doll(?:ied|ying)|orbit(?:ed|ing)|mov(?:ed|ing))\b/i;
  const motionLabel=/\b(?:uses?|shows?|suggests?|indicates?|demonstrates?|reveals?)\s+(?:(?:a|an|the)\s+)?(?:pan|tilt|dolly|orbit)\b|^\s*(?:pan|tilt|dolly|orbit)(?:\s+(?:in|out))?[.!]?\s*$/i;
  const percentageConfidence=/\b\d+(?:\.\d+)?\s*%\s*(?:confiden\w*|certain\w*|probability)|\b(?:confidence|certainty|probability)\b[^.!?]{0,30}\d+(?:\.\d+)?\s*%/i;
  if(numericOptics.test(text)||recoveredOptics.test(text))throw new AnalysisValidationError('analysis','numeric focal-length prose/capture claims are not permitted; use reconstruction control IDs');
  if(motionClaim.test(text)||motionLabel.test(text))throw new AnalysisValidationError('analysis','still-image camera movement claim');
  if(percentageConfidence.test(text))throw new AnalysisValidationError('analysis','confidence percentages are not permitted');
}
export function normalizeAnalysis(raw:unknown,metadata:ProviderMetadata,provenance:ReferenceAnalysis['provenance']='provider'):ReferenceAnalysis {
  validateSchema(raw,referenceAnalysisSchema);
  // Schema establishes the shape. Work on an owned copy so provider mutation cannot bypass validation.
  const content=structuredClone(raw) as AnalysisContent;
  const fail=(message:string):never=>{throw new AnalysisValidationError('analysis',message);};
  const observationMap=new Map(content.observations.map(item=>[item.id,item]));
  if(observationMap.size!==content.observations.length)fail('duplicate observation IDs');
  if(content.observations.filter(item=>item.anchor).length>1)fail('ambiguous primary anchor: supply at most one subject anchor');
  if(content.cameraMovement.evidenceObservationIds.length)fail('a still has no temporal observation evidence');
  for(const observation of content.observations){
    const region=observation.region;
    if(region&&(region.width<=0||region.height<=0||region.x+region.width>1||region.y+region.height>1))fail('region must fit inside normalized image');
    if(observation.confidenceState==='insufficient evidence'&&(observation.anchor||region||observation.lines.length))fail('insufficient observations cannot assert spatial evidence');
    if(observation.anchor&&observation.category!=='subject-placement')fail('subject anchor requires subject-placement observation');
    if(observation.lines.length&&!['perspective','architecture'].includes(observation.category))fail('structural lines require perspective or architecture observations');
  }
  const references=(ids:string[],required:boolean)=>{
    if(new Set(ids).size!==ids.length)fail('duplicate evidence links');
    if(required&&!ids.length)fail('supported inference or suggestion requires observation evidence');
    return ids.map(id=>{
      const observation=observationMap.get(id);
      if(!observation) return fail(`unknown observation reference ${id}`);
      if(required&&observation.confidenceState==='insufficient evidence')fail('insufficient observations cannot support an inference');
      return observation;
    });
  };
  const findings=[...content.composition,content.lensTendency,content.framing,content.perspective,content.cameraMovement];
  for(const item of findings){
    references(item.evidenceObservationIds,item.status!=='unavailable');
    if((item.status==='unavailable')!==(item.confidenceState==='insufficient evidence'))fail('status and evidence strength disagree');
    if(item.status==='unavailable'&&'value' in item&&item.value!==null&&item.value!=='insufficient')fail('unavailable finding cannot carry an asserted value');
    if(item.status!=='unavailable'&&'value' in item&&item.value===null)fail('available finding needs a value');
  }
  if(new Set(content.composition.map(item=>item.controlId)).size!==content.composition.length)fail('duplicate composition candidates');
  if(content.lensTendency.value==='insufficient'&&content.lensTendency.status!=='unavailable')fail('insufficient lens tendency must be unavailable');
  if(content.lensTendency.status==='inferred'){
    const observations=references(content.lensTendency.evidenceObservationIds,true);
    if(!observations.some(item=>['depth','perspective','foreground-background','architecture'].includes(item.category)))fail('lens tendency requires spatial/perspective observations');
    // A style/blur description cannot be the only evidence supporting a lens inference.
    const spatial=/\b(?:relative scale|scale separation|scale difference|perspective (?:exaggeration|reduction|convergence)|convergen\w*|environmental coverage|foreground prominence|depth[- ]plane|facial proportions)\b/i;
    if(!observations.some(item=>spatial.test([item.statement,...item.evidence].join(' '))))fail('lens evidence lacks spatial cues');
  }
  const framing=content.framing.value;
  if(framing?.anchor){
    const anchor=framing.anchor;
    if(!references(content.framing.evidenceObservationIds,true).some(item=>item.anchor&&Math.abs(item.anchor.x-anchor.x)<.000001&&Math.abs(item.anchor.y-anchor.y)<.000001))fail('framing anchor must match linked subject-placement evidence');
  }
  if(new Set(content.suggestedControls.map(item=>item.controlId)).size!==content.suggestedControls.length)fail('duplicate suggestions');
  const confidenceRank=['insufficient evidence','weak evidence','moderate evidence','strong evidence'];
  for(const suggestion of content.suggestedControls){
    const canonical=controls.find(control=>control.id===suggestion.controlId);
    if(!canonical||canonical.category==='camera')fail('unsupported still-image control');
    references(suggestion.evidenceObservationIds,true);
    if(suggestion.confidenceState==='insufficient evidence')fail('insufficient evidence cannot produce a suggestion');
    const inference=canonical?.category==='lens'?content.lensTendency:content.composition.find(item=>item.controlId===suggestion.controlId);
    if(!inference||inference.status==='unavailable')fail('suggestion has no supported inference');
    if(confidenceRank.indexOf(suggestion.confidenceState)>confidenceRank.indexOf(inference!.confidenceState))fail('suggestion cannot be more confident than its inference');
    if(!suggestion.evidenceObservationIds.every(id=>inference!.evidenceObservationIds.includes(id)))fail('suggestion must link evidence from its inference');
    if(canonical?.category==='lens'&&!lensMapping[content.lensTendency.value!]!.includes(suggestion.controlId))fail('suggested lens does not match the broad tendency');
  }
  // Inspect only human-readable text, never identifiers or coordinates.
  content.observations.forEach(item=>[item.statement,...item.evidence].forEach(validateProse));
  findings.forEach(item=>{item.evidence.forEach(validateProse);validateProse(item.source);});
  if(content.perspective.value)validateProse(content.perspective.value);
  content.suggestedControls.forEach(item=>validateProse(item.reason));content.limitations.forEach(validateProse);
  const source=provenance==='development-fixture'?'DEMO / NOT MODEL ANALYSIS':metadata.providerId;
  findings.forEach(item=>{item.source=source;});
  content.cameraMovement.evidence=['Camera movement requires temporal evidence.'];
  const overlays:ReferenceAnalysis['overlays']={};
  const anchor=content.observations.find(item=>item.category==='subject-placement'&&item.anchor)?.anchor;
  if(anchor)overlays.anchor=anchor;
  const negativeCandidate=content.composition.find(item=>item.controlId==='negative-space'&&item.status==='inferred');
  const negative=negativeCandidate?.evidenceObservationIds.map(id=>observationMap.get(id)!).find(item=>item.category==='negative-space'&&item.region)?.region;
  if(negative)overlays.negativeSpace=negative;
  const lines=content.perspective.evidenceObservationIds.flatMap(id=>observationMap.get(id)!.lines);
  if(content.perspective.status==='observed'&&lines.length)overlays.perspectiveLines=lines.slice(0,8);
  return {...content,provenance,providerMetadata:{...metadata},captureMetadata:null,overlays,limitations:[...new Set([...content.limitations,...requiredLimitations])]};
}

/** Only user-selected validated suggestions can be added by the UI. Never auto-populates a stack. */
export function suggestedControlIds(result:ReferenceAnalysis) {return result.suggestedControls.map(item=>item.controlId);}

/** Revalidate the normalized server envelope; raw model output never crosses the HTTP boundary. */
export function normalizeServerAnalysis(value:unknown):ReferenceAnalysis {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new AnalysisValidationError('server','missing normalized result');
  const clone=structuredClone(value) as Record<string,unknown>;
  if(clone.provenance!=='provider'||clone.captureMetadata!==null)throw new AnalysisValidationError('server','invalid result provenance');
  const text={type:'string' as const,minLength:1,maxLength:300};const number={type:'number' as const,minimum:0,maximum:Number.MAX_SAFE_INTEGER};
  const dimensions={type:'object' as const,properties:{width:{...number,minimum:1},height:{...number,minimum:1},format:{enum:['jpeg','png','webp']}},required:['width','height','format'],additionalProperties:false as const};
  validateSchema(clone.providerMetadata,{type:'object',properties:{providerId:text,model:{anyOf:[text,{type:'null'}]},contractVersion:{const:'1'},promptVersion:{const:'1'},requestTimestamp:text,latencyMs:number,input:dimensions,submitted:{...dimensions,properties:{...dimensions.properties,format:{const:'png'}}},transformations:{type:'array',items:text,maxItems:8},imageDetail:{const:'high'},providerRequestId:text,usage:{type:'object',properties:{inputTokens:number,outputTokens:number,totalTokens:number},required:['inputTokens','outputTokens','totalTokens'],additionalProperties:false}},required:['providerId','model','contractVersion','promptVersion'],additionalProperties:false},'providerMetadata');
  const metadata=clone.providerMetadata as ProviderMetadata;
  delete clone.providerMetadata;delete clone.provenance;delete clone.captureMetadata;delete clone.overlays;
  const composition=Array.isArray(clone.composition)?clone.composition:[];
  for(const item of [...composition,clone.lensTendency,clone.framing,clone.perspective,clone.cameraMovement])if(item&&typeof item==='object'&&!Array.isArray(item))(item as Record<string,unknown>).source='image';
  return normalizeAnalysis(clone,metadata);
}

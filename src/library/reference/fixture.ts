import type { AnalysisContent } from './types';
import { normalizeAnalysis } from './validate';

// Authored development fixture; imported only in DEV, never model analysis.
export const fixtureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#d7d2c4"/><path d="M0 650L400 500L1200 650V800H0Z" fill="#c1bdae"/><rect x="300" y="130" width="200" height="490" fill="#9b9e90"/><path d="M330 340H470L445 695H355Z" fill="#424e49"/><ellipse cx="400" cy="267" rx="42" ry="58" fill="#424e49"/><path d="M0 760L300 610M1200 760L500 610" stroke="#aaa99c" fill="none"/></svg>`;
const source='image';
export const fixtureResponse:AnalysisContent = {
  mediaType:'image',
  observations:[
    {id:'subject',category:'subject-placement',statement:'The head anchor lies left of center near the upper-left thirds intersection.',evidence:['The visible head is centered approximately one third across the image.','The head lies approximately one third down the image.'],confidenceState:'strong evidence',region:{x:.275,y:.26,width:.12,height:.61},anchor:{x:1/3,y:1/3},lines:[]},
    {id:'space',category:'negative-space',statement:'A large region to the right contains little structural detail.',evidence:['The background plane to the right is mostly uninterrupted.'],confidenceState:'moderate evidence',region:{x:.6,y:.1,width:.35,height:.75},anchor:null,lines:[]},
    {id:'depth',category:'perspective',statement:'Near/far relative scale separation is difficult to establish in the planar diagram.',evidence:['The background plane offers limited comparable scale landmarks.','Two authored floor lines indicate a depth direction.'],confidenceState:'weak evidence',region:null,anchor:null,lines:[{from:{x:0,y:.95},to:{x:.25,y:.7625}},{from:{x:1,y:.95},to:{x:.4167,y:.7625}}]},
    {id:'framing',category:'framing',statement:'The complete sculptural silhouette is visible.',evidence:['The silhouette spans approximately two thirds of image height.'],confidenceState:'strong evidence',region:{x:.275,y:.26,width:.12,height:.61},anchor:null,lines:[]},
  ],
  composition:[
    {controlId:'rule-of-thirds',status:'inferred',confidenceState:'strong evidence',source,evidence:['Horizontal and vertical anchor placement both support thirds.'],evidenceObservationIds:['subject']},
    {controlId:'negative-space',status:'inferred',confidenceState:'moderate evidence',source,evidence:['The right-hand low-detail region balances the left-hand subject.'],evidenceObservationIds:['space','subject']},
    {controlId:'centered',status:'unavailable',confidenceState:'insufficient evidence',source,evidence:['The identified subject anchor does not support centered placement.'],evidenceObservationIds:['subject']},
    {controlId:'symmetrical',status:'unavailable',confidenceState:'insufficient evidence',source,evidence:['No useful bilateral symmetry is established by the visible structure.'],evidenceObservationIds:[]},
  ],
  lensTendency:{value:'telephoto-like',status:'inferred',confidenceState:'weak evidence',source,evidence:['For this authored test, a restrained scale relationship is interpreted as a tentative telephoto-like tendency. Scene design or cropping could create the same appearance.'],evidenceObservationIds:['depth']},
  framing:{value:{descriptor:'full-body',anchor:{x:1/3,y:1/3},subjectScale:.61},status:'inferred',confidenceState:'strong evidence',source,evidence:['The complete silhouette is visible, with approximate placement supplied by the head anchor.'],evidenceObservationIds:['subject','framing']},
  perspective:{value:'Limited near/far scale evidence',status:'observed',confidenceState:'weak evidence',source,evidence:['The floor lines suggest depth, but the diagram does not establish camera calibration.'],evidenceObservationIds:['depth']},
  cameraMovement:{value:null,status:'unavailable',confidenceState:'insufficient evidence',source,evidence:['Camera movement requires temporal evidence.'],evidenceObservationIds:[]},
  suggestedControls:[
    {controlId:'rule-of-thirds',reason:'Place a visual anchor near a thirds intersection.',confidenceState:'strong evidence',reconstructionSuggestion:true,evidenceObservationIds:['subject']},
    {controlId:'lens-85mm',reason:'Try a telephoto-like reconstruction to explore the tentative scale relationship; this is not a capture claim.',confidenceState:'weak evidence',reconstructionSuggestion:true,evidenceObservationIds:['depth']},
    {controlId:'negative-space',reason:'Leave a quiet region opposite the primary subject.',confidenceState:'moderate evidence',reconstructionSuggestion:true,evidenceObservationIds:['space']},
  ],
  limitations:['DEMO / NOT MODEL ANALYSIS. These authored observations and inferences describe only this sample diagram.','The lens inference is deliberately tentative; this graphic has no physical camera capture.'],
};
export const fixtureAnalysis=normalizeAnalysis(fixtureResponse,{providerId:'development-fixture',model:null,contractVersion:'1',promptVersion:'1'},'development-fixture');

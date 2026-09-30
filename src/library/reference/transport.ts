import { analysisErrors, ReferenceRequestError, type AnalysisErrorCode } from './errors';
import type { ReferenceAnalysisProvider } from './types';
export function createServerProvider(fetcher:typeof fetch=fetch):ReferenceAnalysisProvider {
  const provider:ReferenceAnalysisProvider={
    id:'openai',model:null,resultFormat:'normalized',available:false,
    async checkReadiness(){
      try{const response=await fetcher('/api/reference-analysis',{cache:'no-store',signal:AbortSignal.timeout(5000)});if(!response.ok){provider.available=false;return false;}const data=await response.json();provider.available=data.status==='ready';provider.model=typeof data.model==='string'?data.model:null;return provider.available;}
      catch{provider.available=false;return false;}
    },
    async analyzeImage(image,signal){
      let response:Response;
      try{response=await fetcher('/api/reference-analysis',{method:'POST',headers:{'Content-Type':image.file.type,'X-Reference-Analysis':'1'},body:image.file,signal});}
      catch{throw new ReferenceRequestError(signal.aborted?'cancelled':'server_unavailable');}
      let data:unknown;try{data=await response.json();}catch{throw new ReferenceRequestError('malformed_output');}
      if(!response.ok){const code=(data as {error?:{code?:string}})?.error?.code;throw new ReferenceRequestError(code&&Object.hasOwn(analysisErrors,code)?code as AnalysisErrorCode:'server_unavailable');}
      return (data as {analysis?:unknown})?.analysis;
    },
  };return provider;
}

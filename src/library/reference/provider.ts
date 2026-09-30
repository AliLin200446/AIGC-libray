import { createServerProvider } from './transport';
import { ReferenceRequestError } from './errors';
import { normalizeAnalysis, normalizeServerAnalysis } from './validate';
import { AnalysisValidationError } from './schema';
import type { ProviderState, ReferenceAnalysisProvider, ReferenceImage } from './types';

// Browser transport only. Readiness and all credentials belong to the same-origin server.
export const referenceProvider: ReferenceAnalysisProvider = import.meta.env?.PROD
  ? { id: 'unavailable', model: null, available: false, async analyzeImage() { throw new ReferenceRequestError('server_unavailable'); } }
  : createServerProvider();
export const analysisPromptPath = 'docs/reference-analysis-prompt.md';
export const analysisPromptVersion = '1';

/** Provider transport -> untrusted JSON -> schema + semantic validation -> normalized UI state. */
export class ReferenceAnalysisEngine {
  state: ProviderState;
  private sequence=0;
  private abort:AbortController|null=null;
  constructor(private provider:ReferenceAnalysisProvider|null,private changed:(state:ProviderState)=>void=()=>{}) {
    this.state={status:provider&&provider.available!==false?'ready':'not-connected',result:null,error:null};
  }
  private publish(state:ProviderState){this.state=state;this.changed(state);}
  reset(){this.sequence++;this.abort?.abort();this.abort=null;this.publish({status:this.provider&&this.provider.available!==false?'ready':'not-connected',result:null,error:null});}
  async refreshAvailability(){if(!this.provider?.checkReadiness)return;const ticket=this.sequence;const ready=await this.provider.checkReadiness();if(ticket===this.sequence&&this.state.status!=='analyzing')this.publish({status:ready?'ready':'not-connected',result:null,error:null});}
  async analyzeReference(image:ReferenceImage):Promise<ProviderState> {
    this.reset();
    if(!this.provider||this.provider.available===false)return this.state;
    const ticket=this.sequence;const abort=new AbortController();this.abort=abort;
    this.publish({status:'analyzing',result:null,error:null});
    try {
      const raw=await this.provider.analyzeImage(image,abort.signal);
      if(ticket!==this.sequence||abort.signal.aborted)return this.state;
      const result=this.provider.resultFormat==='normalized'?normalizeServerAnalysis(raw):normalizeAnalysis(raw,{providerId:this.provider.id,model:this.provider.model,contractVersion:'1',promptVersion:analysisPromptVersion});
      this.publish({status:'completed',result,error:null});
    } catch(error) {
      if(ticket!==this.sequence||abort.signal.aborted)return this.state;
      // Never display arbitrary transport errors, credentials, or raw model output in the UI.
      this.publish({status:'error',result:null,error:error instanceof ReferenceRequestError?error.message:error instanceof AnalysisValidationError?'Analysis response did not meet the evidence contract. No suggestions were accepted.':'Analysis failed. Please try again; no suggestions were accepted.'});
    } finally {if(ticket===this.sequence)this.abort=null;}
    return this.state;
  }
  dispose(){this.sequence++;this.abort?.abort();this.abort=null;}
}

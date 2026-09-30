import type { IncomingMessage, ServerResponse } from 'node:http';
import { analyzeOpenAI, type ServerConfig } from './openai';
import { analysisErrors, MAX_REFERENCE_BYTES, ReferenceRequestError } from '../src/library/reference/errors';
export function createReferenceMiddleware(config:ServerConfig,options:{fetcher?:typeof fetch;diagnostic?:(event:{code:string;status:number})=>void}={}){
  let active=0;
  return (req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
    if(req.url?.split('?')[0]!=='/api/reference-analysis'){next();return;}
    const send=(status:number,data:unknown)=>{if(!res.destroyed&&!res.writableEnded){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}};
    const controller=new AbortController();
    const abort=()=>{if(!res.writableEnded)controller.abort();};req.on('aborted',abort);res.on('close',abort);
    void (async()=>{
      let acquired=false;
      try{
        // No CORS. A custom header disallows cross-site HTML form submissions.
        if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host))throw new ReferenceRequestError('invalid_request');
        if(req.method==='GET'){send(200,{status:config.apiKey?'ready':'not-connected',provider:'openai',model:config.model,maxBytes:MAX_REFERENCE_BYTES});return;}
        if(req.method!=='POST'||req.headers['x-reference-analysis']!=='1')throw new ReferenceRequestError('invalid_request');
        const mime=req.headers['content-type']?.split(';')[0]?.trim()??'';
        if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new ReferenceRequestError('unsupported_image');
        const declared=Number(req.headers['content-length']);if(Number.isFinite(declared)&&declared>MAX_REFERENCE_BYTES)throw new ReferenceRequestError('image_too_large');
        if(active>=2)throw new ReferenceRequestError('rate_limit');active++;acquired=true;
        const chunks:Buffer[]=[];let total=0;
        for await(const chunk of req){const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);total+=bytes.length;if(total>MAX_REFERENCE_BYTES)throw new ReferenceRequestError('image_too_large');chunks.push(bytes);}
        if(!total)throw new ReferenceRequestError('missing_image');
        const analysis=await analyzeOpenAI(Buffer.concat(chunks),mime,config,controller.signal,options.fetcher);
        send(200,{analysis});
      }catch(error){
        const code=error instanceof ReferenceRequestError?error.code:controller.signal.aborted?'cancelled':'invalid_request';
        const status=code==='missing_key'?503:code==='image_too_large'?413:code==='unsupported_image'?415:code==='timeout'?504:code==='rate_limit'?429:code==='cancelled'?499:['missing_image','invalid_request'].includes(code)?400:502;
        options.diagnostic?.({code,status});send(status,{error:{code,message:analysisErrors[code]}});
      }finally{if(acquired)active--;req.off('aborted',abort);res.off('close',abort);}
    })();
  };
}

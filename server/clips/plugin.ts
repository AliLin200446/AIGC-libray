import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { storeRoot, readBatch, readPrivateAsset } from './store';
import { reviewCandidate, type ReviewInput } from './review';
import { readPublication } from './publication';
import { permissionFile } from './pipeline';
export function serveBytes(req:IncomingMessage,res:ServerResponse,bytes:Buffer,mime:string) {
  res.setHeader('Content-Type',mime);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-store');
  let start=0,end=bytes.length-1;
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});res.end();return;}
    if(match[1]){start=Number(match[1]);end=match[2]?Number(match[2]):end;}else start=Math.max(0,bytes.length-Number(match[2]));
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=bytes.length||end<start){res.writeHead(416,{'Content-Range':`bytes */${bytes.length}`});res.end();return;}
    end=Math.min(end,bytes.length-1);res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
  }
  res.setHeader('Content-Length',end-start+1);res.end(req.method==='HEAD'?undefined:bytes.subarray(start,end+1));
}
function localRequest(req:IncomingMessage){
  const host=req.headers.host??'';const name=new URL('http://'+host).hostname;
  if(!['127.0.0.1','localhost','[::1]'].includes(name)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??''))throw Error('Review is available on loopback only.');
  if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&new URL(req.headers.origin).host!==host))throw Error('Cross-origin review request rejected.');
}
export function reviewMiddleware(root=process.cwd()) {
  return (req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
    const url=new URL(req.url??'/','http://local');if(!url.pathname.startsWith('/dev/clip-ingestion/'))return next();
    void(async()=>{
      const send=(status:number,value:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
      try{
        localRequest(req);const mode=url.searchParams.get('mode')??'mock';if(mode!=='mock'&&mode!=='live')throw Error('Unknown queue mode.');const directory=storeRoot(mode,root);
        if(url.pathname==='/dev/clip-ingestion/data'&&req.method==='GET'){send(200,{batch:await readBatch(directory)});return;}
        if(url.pathname==='/dev/clip-ingestion/review'&&req.method==='POST'){
          if(req.headers['x-framefield-review']!=='1'||!req.headers.origin||req.headers['content-type']!=='application/json')throw Error('Same-origin JSON review request required.');
          const chunks:Buffer[]=[];let total=0;for await(const chunk of req){const bytes=Buffer.from(chunk);total+=bytes.length;if(total>128*1024)throw Error('Review request too large.');chunks.push(bytes);}
          const input=JSON.parse(Buffer.concat(chunks).toString()) as ReviewInput;
          send(200,{candidate:await reviewCandidate(directory,input,root)});return;
        }
        const match=/^\/dev\/clip-ingestion\/media\/((?:mock|pexels)-[1-9]\d*)\/(video\.(?:mp4|webm)|poster\.jpg|frame-\d+\.jpg)$/.exec(url.pathname);
        if(match&&(req.method==='GET'||req.method==='HEAD')){
          if(mode==='live')await permissionFile(directory,'cache');
          const batch=await readBatch(directory);const c=batch?.candidates.find(c=>c.id===match[1]);const file=`${match[1]}/${match[2]}`;
          if(!c||!(c.asset?.file===file||c.asset?.poster===file||c.samples.some(s=>s.file===file)))throw Error('Media not in this queue.');
          serveBytes(req,res,await readPrivateAsset(directory,file),file.endsWith('.jpg')?'image/jpeg':file.endsWith('.webm')?'video/webm':'video/mp4');return;
        }
        send(404,{error:'Unknown review endpoint.'});
      }catch(e){send(400,{error:e instanceof Error?e.message:'Review failed.'});}
    })();
  };
}
export function clipContentPlugin():Plugin {
  return {name:'curated-cinematic-clips',resolveId(id){if(id==='virtual:framefield-clips')return '\0framefield-clips';},async load(id){if(id==='\0framefield-clips')return `export default ${JSON.stringify((await readPublication()).map(e=>e.clip))};`;},async generateBundle(){for(const e of await readPublication()){this.emitFile({type:'asset',fileName:e.clip.videoUrl!.slice(1),source:e.video});this.emitFile({type:'asset',fileName:e.clip.posterUrl.slice(1),source:e.poster});}},configureServer(server){
    server.middlewares.use(reviewMiddleware());
    server.middlewares.use((req,res,next)=>{const path=(req.url??'').split('?')[0];if(!path?.startsWith('/clip-media/'))return next();void(async()=>{try{if(req.method!=='GET'&&req.method!=='HEAD')throw Error();for(const e of await readPublication()){if(path===e.clip.videoUrl){serveBytes(req,res,e.video,'video/mp4');return;}if(path===e.clip.posterUrl){serveBytes(req,res,e.poster,'image/jpeg');return;}}throw Error();}catch{res.statusCode=404;res.end('Published clip unavailable.');}})();});
  }};
}

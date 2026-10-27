import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { importUrls, receiveUpload, importUpload, selectClip, assetFile, canServe, maxUploadBytes } from './import';
import { parseManifest } from './manifest';
import type { ImportInput } from './types';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { readReferences, reviewReference, processingAllowed, displayAllowed } from './store';
import type { ReviewInput } from './types';
export function filmReviewMiddleware(root=process.cwd()) {
 return (req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
  const path=(req.url??'').split('?')[0];if(!path?.startsWith('/admin/references/api/'))return next();
  void(async()=>{const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
   try {
    const host=req.headers.host??'';const hostname=new URL('http://'+host).hostname;
    if(!['localhost','127.0.0.1','[::1]'].includes(hostname)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??''))throw Error('Local review only.');
    if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&new URL(req.headers.origin).host!==host))throw Error('Cross-origin request rejected.');
    if(path==='/admin/references/api/queue'&&req.method==='GET') {const candidates=await readReferences(root);send(200,{candidates,gates:Object.fromEntries(candidates.map(c=>[c.id,{processing:processingAllowed(c),display:displayAllowed(c)}])),publishingEnabled:false,processingEnabled:true});return;}
    const media=/^\/admin\/references\/api\/media\/(film-discovery-\d{2})\/(original|optimized|poster)$/.exec(path);
    if(media&&(req.method==='GET'||req.method==='HEAD')) {
     const c=(await readReferences(root)).find(c=>c.id===media[1]);if(!c||!canServe(c,media[2]!))throw Error('Local playback permission missing or revoked.');
     const m=c.media!;const relative=media[2]==='original'?m.localAssetPath:media[2]==='poster'?m.posterPath:m.optimizedPath;if(!relative)throw Error('Asset unavailable.');
     const file=assetFile(root,relative);const {size}=await stat(file);let start=0,end=size-1;
     if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}
      start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
     res.setHeader('Content-Type',media[2]==='poster'?'image/jpeg':media[2]==='original'?m.mimeType!:'video/mp4');res.setHeader('Content-Length',end-start+1);res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
     if(req.method==='HEAD')res.end();else {const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}return;
    }
    const actions=['review','import-url','import-manifest','upload','select','prepare'];
    const action=path.slice('/admin/references/api/'.length);
    if(actions.includes(action)&&req.method==='POST') {
     if(action==='upload') {
      if(!req.headers.origin||req.headers['x-framefield-review']!=='1')throw Error('Same-origin upload required.');
      const mime=req.headers['content-type']??'';if(!['video/mp4','video/webm'].includes(mime))throw Error('Unsupported media MIME type.');
      if(Number(req.headers['content-length'])>maxUploadBytes)throw Error('Maximum upload size is 128 MiB.');
      const header=req.headers['x-framefield-import'];if(typeof header!=='string'||header.length>12000)throw Error('Missing upload metadata.');const input=JSON.parse(decodeURIComponent(header)) as ImportInput & {filename:string};
      const file=await receiveUpload(req,root);send(200,{candidate:await importUpload(root,input,file,mime,input.filename)});return;
     }
     if(!req.headers.origin||req.headers['x-framefield-review']!=='1'||req.headers['content-type']!=='application/json')throw Error('Same-origin JSON review required.');
     const chunks:Buffer[]=[];let total=0;for await(const chunk of req){const b=Buffer.from(chunk);total+=b.length;if(total>65536)throw Error('Request too large.');chunks.push(b);}
     const body=JSON.parse(Buffer.concat(chunks).toString());
     if(action==='review')send(200,{candidate:await reviewReference(root,body as ReviewInput)});
     else if(action==='import-url')send(200,{candidates:await importUrls(root,[body as ImportInput])});
     else if(action==='import-manifest')send(200,{candidates:await importUrls(root,parseManifest(body.manifest))});
     else send(200,{candidate:await selectClip(root,body as ImportInput,action==='prepare')});return;
    }
    send(404,{error:'Unknown endpoint. Publication is disabled in this local pilot.'});
   }catch(e){send(400,{error:e instanceof Error?e.message:'Review failed.'});}
  })();
 };
}
export function filmReferencesPlugin():Plugin {return {name:'local-film-reference-review',configureServer(server){server.middlewares.use(filmReviewMiddleware(process.env.FRAMEFIELD_REVIEW_ROOT??process.cwd()));}};}

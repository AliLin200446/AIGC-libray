import { Readable } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
/** Local preview bridge to the exact Web Request handler deployed on Vercel. */
export function referenceNode(handler: (request: Request) => Promise<Response>) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const controller = new AbortController();
    const abort = () => { if (!res.writableEnded) controller.abort(); };
    req.on('aborted', abort); res.on('close', abort);
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const init: RequestInit & { duplex?: 'half' } = { method: req.method ?? 'GET', headers, signal: controller.signal };
      if (!['GET','HEAD'].includes(init.method!)) { init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>; init.duplex = 'half'; }
      const result = await handler(new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, init));
      if (!res.destroyed) { res.writeHead(result.status, Object.fromEntries(result.headers)); res.end(Buffer.from(await result.arrayBuffer())); }
    } catch { if (!res.destroyed && !res.writableEnded) { res.writeHead(500, { 'Content-Type':'application/json', 'Cache-Control':'no-store' }); res.end('{"error":{"code":"server_unavailable","message":"Analysis is currently unavailable."}}'); } }
    finally { req.off('aborted', abort); res.off('close', abort); }
  };
}

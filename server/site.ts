import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { controls } from '../src/controls';
const detailPaths = new Set(controls.map(c => `/library/${c.id}`));
const mime: Record<string,string> = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.xml':'application/xml', '.txt':'text/plain' };
export function staticSite(directory: string) {
  const root = resolve(directory);
  return async (req: IncomingMessage, res: ServerResponse) => {
    const headers = { 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'strict-origin-when-cross-origin', 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" };
    try {
      if(req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, headers); res.end(); return; }
      const url = new URL(req.url ?? '/', 'http://internal');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname === '/library' || pathname === '/library/') { res.writeHead(301, { ...headers, Location: '/' + url.search }); res.end(); return; }
      const clean = pathname.replace(/\/$/, '');
      const route = pathname === '/' ? '/index.html' : detailPaths.has(clean) ? `${clean}/index.html` : pathname;
      let file = resolve(root, '.' + route), status = 200;
      if (!file.startsWith(root + sep) || pathname.startsWith('/dev/') || pathname.startsWith('/api/')) { file = resolve(root, '404.html'); status = 404; }
      try { if (!(await stat(file)).isFile()) throw new Error('Not a file'); } catch { file = resolve(root, '404.html'); status = 404; }
      const bytes = await readFile(file);
      res.writeHead(status, { ...headers, 'Content-Type':mime[extname(file)] ?? 'application/octet-stream', 'Cache-Control':status === 200 && pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { res.writeHead(404, headers); res.end('Page not found'); }
  };
}

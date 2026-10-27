import { createHash, randomBytes } from 'node:crypto';
import { analyzeOpenAI, type ServerConfig } from './openai';
import { analysisErrors, ReferenceRequestError, PUBLIC_ANALYSIS_BYTES } from '../src/library/reference/errors';

/** Best-effort instance-local guard, not a distributed quota or a spending cap. */
export class ReferenceBudget {
  private clients = new Map<string, { count: number; until: number; activeUntil: number }>();
  private salt = randomBytes(16);
  acquire(ip: string, now = Date.now()): () => void {
    for (const [key, entry] of this.clients) if (entry.until <= now && entry.activeUntil <= now) this.clients.delete(key);
    const key = createHash('sha256').update(this.salt).update(ip).digest('hex');
    const entry = this.clients.get(key) ?? { count: 0, until: now + 600000, activeUntil: 0 };
    if (entry.until <= now) { entry.count = 0; entry.until = now + 600000; }
    const active = [...this.clients.values()].filter(e => e.activeUntil > now).length;
    if (entry.activeUntil > now || entry.count >= 5 || active >= 2 || (!this.clients.has(key) && this.clients.size >= 2048)) throw new ReferenceRequestError('rate_limit');
    const lease = now + 90000;
    entry.count++; entry.activeUntil = lease; this.clients.set(key, entry);
    return () => { if (entry.activeUntil === lease) entry.activeUntil = 0; };
  }
}
export function createPublicReferenceHandler(config: ServerConfig, adapter = analyzeOpenAI, budget = new ReferenceBudget()) {
  return async (request: Request): Promise<Response> => {
    const respond = (status: number, body: unknown) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status === 429 ? { 'Retry-After': '600' } : {}) } });
    let release: (() => void) | undefined;
    try {
      const origin = request.headers.get('origin');
      if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && new URL(origin).host !== new URL(request.url).host)) throw new ReferenceRequestError('invalid_request');
      if (request.method === 'GET') return respond(200, { status: config.apiKey ? 'ready' : 'not-connected', provider: 'openai', model: config.model, maxBytes: PUBLIC_ANALYSIS_BYTES });
      if (request.method !== 'POST' || request.headers.get('x-reference-analysis') !== '1') throw new ReferenceRequestError('invalid_request');
      if (!config.apiKey) throw new ReferenceRequestError('missing_key');
      const mime = request.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
      if (!['image/jpeg','image/png','image/webp'].includes(mime)) throw new ReferenceRequestError('unsupported_image');
      if (Number(request.headers.get('content-length')) > PUBLIC_ANALYSIS_BYTES) throw new ReferenceRequestError('analysis_image_too_large');
      // Vercel supplies this address. Never log or persist it; local tests use a shared fallback.
      release = budget.acquire(request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown');
      const reader = request.body?.getReader();
      if (!reader) throw new ReferenceRequestError('missing_image');
      const uploadTimeout = AbortSignal.timeout(10000);
      const signal = AbortSignal.any([request.signal, uploadTimeout]);
      const abort = () => { void reader.cancel().catch(() => {}); };
      signal.addEventListener('abort', abort, { once: true });
      const chunks: Buffer[] = []; let total = 0;
      try {
        while (true) {
          if (signal.aborted) throw new ReferenceRequestError(request.signal.aborted ? 'cancelled' : 'timeout');
          const { value, done } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > PUBLIC_ANALYSIS_BYTES) { await reader.cancel(); throw new ReferenceRequestError('analysis_image_too_large'); }
          chunks.push(Buffer.from(value));
        }
        if (signal.aborted) throw new ReferenceRequestError(request.signal.aborted ? 'cancelled' : 'timeout');
      } finally { signal.removeEventListener('abort', abort); reader.releaseLock(); }
      if (!total) throw new ReferenceRequestError('missing_image');
      const analysis = await adapter(Buffer.concat(chunks), mime, { ...config, timeoutMs: Math.min(config.timeoutMs, 60000) }, request.signal);
      return respond(200, { analysis });
    } catch (error) {
      const code = request.signal.aborted ? 'cancelled' : error instanceof ReferenceRequestError ? error.code : 'invalid_request';
      const status = code === 'missing_key' ? 503 : code === 'rate_limit' ? 429 : code === 'timeout' ? 504 : code === 'cancelled' ? 499 : ['image_too_large','analysis_image_too_large'].includes(code) ? 413 : code === 'unsupported_image' ? 415 : ['missing_image','invalid_request'].includes(code) ? 400 : 502;
      return respond(status, { error: { code, message: analysisErrors[code] } });
    } finally { release?.(); }
  };
}

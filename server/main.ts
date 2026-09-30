import { createServer } from 'node:http';
import { staticSite } from './site';
// Local production-output preview. Public release uses Vercel static hosting.
// No provider middleware or credentials are loaded by this server.
const handler = staticSite('dist');
const server = createServer((req, res) => { void handler(req, res); });
server.requestTimeout = 15000; server.headersTimeout = 10000;
server.listen(Number(process.env.PORT ?? 5175), '127.0.0.1', () => console.log('Framefield static preview ready. Reference Analysis disabled.'));

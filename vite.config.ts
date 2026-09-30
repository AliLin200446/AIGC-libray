import { defineConfig, loadEnv } from 'vite';
import { createReferenceMiddleware } from './server/api';
import { serverConfig } from './server/openai';
export default defineConfig(({mode})=>{
  const config=serverConfig({...loadEnv(mode,process.cwd(),'OPENAI_'),...process.env});
  return {server:{fs:{deny:['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/local-reference-suite/**', '**/reference-evaluation/**']}},plugins:[{name:'reference-analysis-api',configureServer(server){server.middlewares.use(createReferenceMiddleware(config));},configurePreviewServer(server){server.middlewares.use(createReferenceMiddleware(config));}}]};
});

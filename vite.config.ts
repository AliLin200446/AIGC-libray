import {createAnalyzeHandler} from './server/analyze';
import { filmReferencesPlugin } from './server/film-references/plugin';
import { clipContentPlugin } from './server/clips/plugin';
import { recipeContentPlugin } from './server/recipes';
import { defineConfig, loadEnv } from 'vite';
import { createReferenceMiddleware } from './server/api';
import { serverConfig } from './server/openai';
export default defineConfig(({mode})=>{
  const analyze=createAnalyzeHandler(loadEnv(mode,process.cwd(),'NVIDIA_').NVIDIA_API_KEY??process.env.NVIDIA_API_KEY);
  const config=serverConfig({...loadEnv(mode,process.cwd(),'OPENAI_'),...process.env});
  return {server:{fs:{deny:['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/local-reference-suite/**', '**/reference-evaluation/**', '**/local-recipes/**', '**/local-clip-ingestion/**', '**/local-film-references/**', '**/clip-publication/**', '**/scripts/fixtures/**']}},plugins:[filmReferencesPlugin(),clipContentPlugin(),recipeContentPlugin(),{name:'reference-analysis-api',configureServer(server){server.middlewares.use('/api/analyze',(req,res)=>{void analyze(req,res);});server.middlewares.use(createReferenceMiddleware(config));},configurePreviewServer(server){server.middlewares.use('/api/analyze',(req,res)=>{void analyze(req,res);});server.middlewares.use(createReferenceMiddleware(config));}}]};
});

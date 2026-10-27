import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnv } from 'vite';
import { readReferences } from '../server/film-references/store';
import { ResearchProvider, YouTubeDiscoveryProvider, discoverBatch } from '../server/film-references/discovery';
const mode=process.argv[2]??'research';if(!['research','youtube'].includes(mode))throw Error('Choose research or youtube.');
const file=`local-film-references/discovery-${mode}.json`;
let cached:{expiresAt:string}|null=null;
try{cached=JSON.parse(await readFile(file,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
if(cached&&Date.parse(cached.expiresAt)>Date.now()){console.log(`Fresh metadata report already exists: ${file}. Stopped for review; no requests made.`);}
else {
 const env={...loadEnv('development',process.cwd(),['YOUTUBE_']),...process.env};
 const provider=mode==='research'?new ResearchProvider():new YouTubeDiscoveryProvider(env.YOUTUBE_API_KEY??'',new Set((env.YOUTUBE_CHANNEL_IDS??'').split(',').map(s=>s.trim()).filter(Boolean)));
 const report=await discoverBatch(await readReferences(),provider,mode==='research'?0:1100);
 await mkdir('local-film-references',{recursive:true});await writeFile(file,JSON.stringify({...report,createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()},null,2)+'\n',{mode:0o600});
 console.log(`${report.results.length} metadata candidates; ${report.errors.length} errors. Saved ${file}. Stopped for review. No queue changes, downloads, analysis, or publication.`);
 if(report.errors.length)process.exitCode=1;
}

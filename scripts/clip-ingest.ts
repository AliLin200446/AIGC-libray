import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { seedMock } from '../server/clips/mock';
import { storeRoot } from '../server/clips/store';
import { runLiveBatch, liveDependencies } from '../server/clips/pipeline';
import { preparePublication } from '../server/clips/publication';
for(const file of ['.env.local','.env'])if(existsSync(file))loadEnvFile(file);
const command=process.argv[2];
try {
  if(command==='mock'){
    const batch=await seedMock(storeRoot('mock'));console.log(`Local mock pilot ready: ${batch.candidates.length} candidates. No network calls. Open /dev/clip-ingestion using npm run dev.`);
  }else if(command==='live'){
    const directory=storeRoot('live');const batch=await runLiveBatch(directory,liveDependencies(directory,process.env));console.log(`Pilot stopped: ${batch.candidates.length} candidates; ${batch.requests} searches; ${batch.analysisCalls} analysis attempts. Status: ${batch.status}. Review /dev/clip-ingestion. Nothing published.`);
  }else if(command==='prepare-release'){
    const count=await preparePublication(storeRoot('live'));console.log(`Prepared ${count} approved live clips in clip-publication. Review the snapshot and build explicitly. No deployment performed.`);
  }else throw Error('Use mock, live, or prepare-release.');
}catch(e){console.error(e instanceof Error?e.message:'Clip pipeline failed.');process.exitCode=1;}

import { readFile,writeFile,mkdir,copyFile } from 'node:fs/promises';
import { resolve,extname } from 'node:path';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { parseRecipe,readiness } from '../src/recipes/model';
import { videoBytes } from '../server/recipes';
const {values}=parseArgs({options:{id:{type:'string',default:'recipe-01'},video:{type:'string'},prompt:{type:'string'},model:{type:'string'},'model-version':{type:'string'},title:{type:'string'},creator:{type:'string'},notes:{type:'string'},controls:{type:'string'},rights:{type:'string'},'confirmed-by':{type:'string'},source:{type:'string'},status:{type:'string'},help:{type:'boolean'}}});
if(values.help){console.log('npm run recipe:ingest -- --video path.mp4 --prompt prompt.txt --model "Exact model" --creator "Name" --title "Title"\nOptional: --controls controls.json --rights creator-owned|licensed --confirmed-by "Name" --source "Source / rights evidence" --status draft|curated|published\nModel version and notes remain unknown unless --model-version / --notes are supplied.');process.exit(0);}
if(!/^recipe-[a-z0-9-]+$/.test(values.id))throw Error('Invalid recipe ID.');
const path=resolve(`src/recipes/content/${values.id}.json`);const r=parseRecipe(JSON.parse(await readFile(path,'utf8')));const t=r.translations[0]!,result=r.results[0]!;const dir=resolve(`local-recipes/${r.id}`);await mkdir(dir,{recursive:true});
if(values.video){const ext=extname(values.video).toLowerCase();if(!['.mp4','.webm'].includes(ext))throw Error('Use MP4 or WebM.');const bytes=await readFile(values.video);result.asset=`/recipe-media/${r.id}/result${ext}`;result.sha256=createHash('sha256').update(bytes).digest('hex');const destination=resolve(dir,`result${ext}`);if(resolve(values.video)!==destination)await copyFile(values.video,destination);await videoBytes({...r,status:'draft'});}
if(values.prompt){const prompt=await readFile(values.prompt,'utf8');if(!prompt.trim())throw Error('Submitted prompt must not be empty.');t.submittedPrompt=prompt;await writeFile(resolve(dir,'prompt.txt'),prompt);}
if(values.model)t.model=values.model;if(values['model-version'])t.modelVersion=values['model-version'];if(values.title)r.title=values.title;if(values.creator)r.creator.name=values.creator;if(values.notes)result.creatorNotes=values.notes;
if(values.controls){r.controls=JSON.parse(await readFile(values.controls,'utf8'));r.mappingConfirmedBy=values['confirmed-by']??null;}
if(values.rights)result.provenance.rightsStatus=values.rights as typeof result.provenance.rightsStatus;
if(values['confirmed-by'])result.provenance.confirmedBy=values['confirmed-by'];if(values.source)result.provenance.source=values.source;
r.status=values.status?(values.status as typeof r.status):'draft';
if(values.video||values.prompt)r.createdAt??=new Date().toISOString();
const validated=parseRecipe(r);const missing=readiness(validated);if(validated.status!=='draft'){if(missing.length)throw Error(`Not ready: ${missing.join(', ')}`);await videoBytes({...validated,status:'curated'});}
if(validated.status==='published'){const bytes=await videoBytes({...validated,status:'curated'});const ext=validated.results[0]!.asset!.split('.').at(-1)!;const target=resolve(`recipe-assets/${validated.id}`);await mkdir(target,{recursive:true});await writeFile(resolve(target,`result.${ext}`),bytes);}
await writeFile(path,JSON.stringify(validated,null,2)+'\n');console.log(`${r.id}: ${r.status}. ${missing.length?'Still required: '+missing.join(', '):'Ready for human preview / publication.'}`);

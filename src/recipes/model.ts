import { controls } from '../controls';
import type { Recipe,RecipeControl,RecipeScene,RecipeCamera } from './types';
const text=(x:unknown):x is string=>typeof x==='string'&&x.trim().length>0;
const record=(x:unknown):x is Record<string,unknown>=>typeof x==='object'&&x!==null&&!Array.isArray(x);
const nullableText=(x:unknown)=>x===null||typeof x==='string';
const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
export function validateControls(value:unknown):value is RecipeControl[]{
 if(!Array.isArray(value)||value.length>12)return false;
 const ids=new Set<string>();
 return value.every(item=>{if(!record(item)||!text(item.controlId)||!record(item.parameters)||ids.has(item.controlId))return false;ids.add(item.controlId);const control=controls.find(c=>c.id===item.controlId);if(!control)return false;
  return Object.entries(item.parameters).every(([key,v])=>{const p=control.parameters.find(p=>p.id===key);if(!p)return false;return p.kind==='number'?finite(v)&&v>=p.min&&v<=p.max:p.kind==='boolean'?typeof v==='boolean':typeof v==='string'&&p.options.includes(v);});
 });
}
export function validScene(value:unknown):value is RecipeScene {
 if(!record(value)||value.version!==1||value.primarySubjectId!=='subject'||!Array.isArray(value.objects)||value.objects.length<1||value.objects.length>8)return false;
 const ids=new Set<string>();let subjects=0;
 return value.objects.every(o=>{if(!record(o)||!text(o.id)||!/^[-a-z0-9]+$/.test(o.id)||['__proto__','constructor','prototype','camera'].includes(o.id)||ids.has(o.id)||!['block','plane','frame','subject'].includes(String(o.primitiveType))||!text(o.label)||o.label.length>32||!record(o.position))return false;ids.add(o.id);if(o.id==='subject'){subjects++;if(o.primitiveType!=='subject'||o.semanticRole!=='subject')return false;}else if(o.semanticRole!=='spatial')return false;
  if(o.rotation!==undefined&&(!record(o.rotation)||!['x','y','z'].every(k=>finite((o.rotation as Record<string,unknown>)[k]))))return false;
  if(o.scaleXYZ!==undefined&&(!record(o.scaleXYZ)||!['x','y','z'].every(k=>{const n=(o.scaleXYZ as Record<string,unknown>)[k];return finite(n)&&n>=.25&&n<=3;})))return false;
  const position=o.position;return ['x','y','z'].every(k=>finite(position[k])&&Math.abs(position[k] as number)<=(k==='y'?6:14))&&(o.position.y as number)>=0&&finite(o.scale)&&o.scale>=.25&&o.scale<=3&&finite(o.rotationY)&&o.rotationY>=0&&o.rotationY<360;
 })&&subjects===1;
}
export function validCamera(v:unknown):v is RecipeCamera {if(!record(v)||!Array.isArray(v.position)||!Array.isArray(v.target)||v.position.length!==3||v.target.length!==3)return false;return (v.roll===undefined||finite(v.roll))&&(v.targetMode===undefined||v.targetMode==='subject'||v.targetMode==='free')&&(v.framingLock===undefined||typeof v.framingLock==='boolean')&&[...v.position,...v.target].every(n=>finite(n)&&Math.abs(n)<=100)&&finite(v.focalLength)&&v.focalLength>=24&&v.focalLength<=85&&v.position.some((n,i)=>Math.abs(n-(v.target as number[])[i]!)>.01);}
export function parseRecipe(value:unknown):Recipe {
 if(!record(value)||value.version!==1||!text(value.id)||!text(value.slug)||!/^recipe-[a-z0-9-]+$/.test(value.id)||!/^[-a-z0-9]+$/.test(value.slug)||!text(value.title)||!['draft','curated','published'].includes(String(value.status))||!record(value.creator)||!nullableText(value.creator.name)||!nullableText(value.creator.portfolio)||!nullableText(value.description)||!nullableText(value.createdAt)||!nullableText(value.mappingConfirmedBy)||!validateControls(value.controls)||!Array.isArray(value.tags)||!value.tags.every(text)||!Array.isArray(value.translations)||!Array.isArray(value.results))throw Error('Invalid recipe schema or canonical control parameters.');
 if(value.creator.portfolio!==null&&!/^https:\/\//.test(String(value.creator.portfolio)))throw Error('Portfolio must use HTTPS.');
 if(value.sceneState!==null&&!validScene(value.sceneState))throw Error('Incompatible scene snapshot.');if(value.cameraState!==null&&!validCamera(value.cameraState))throw Error('Invalid camera snapshot.');
 const translationIds=new Set<string>();for(const t of value.translations){if(!record(t)||!text(t.id)||translationIds.has(t.id)||![t.model,t.modelVersion,t.submittedPrompt].every(nullableText)||(t.settings!==null&&(!record(t.settings)||!Object.values(t.settings).every(v=>typeof v==='string'||typeof v==='boolean'||finite(v)))))throw Error('Invalid translation.');translationIds.add(t.id);}
 const resultIds=new Set<string>();for(const r of value.results){if(!record(r)||!text(r.id)||resultIds.has(r.id)||!text(r.translationId)||!translationIds.has(r.translationId)||r.mediaType!=='video'||![r.asset,r.sha256,r.creatorNotes,r.observedBehavior,r.deviations,r.createdAt].every(nullableText)||!record(r.provenance)||!['unknown','creator-owned','licensed'].includes(String(r.provenance.rightsStatus))||![r.provenance.confirmedBy,r.provenance.source].every(nullableText))throw Error('Invalid result provenance.');if(r.asset!==null&&!/^\/recipe-media\/recipe-[a-z0-9-]+\/result\.(mp4|webm)$/.test(String(r.asset)))throw Error('Use a local curated video asset.');if(r.sha256!==null&&!/^[a-f0-9]{64}$/.test(String(r.sha256)))throw Error('Invalid asset digest.');resultIds.add(r.id);}
 return structuredClone(value) as unknown as Recipe;
}
export function readiness(recipe:Recipe):string[]{
 const missing:string[]=[];if(!text(recipe.creator.name))missing.push('Creator name');if(!recipe.controls.length)missing.push('At least one canonical control');if(!text(recipe.mappingConfirmedBy))missing.push('Human control mapping confirmation');if(!text(recipe.createdAt))missing.push('Recipe creation date');if(!recipe.results.length)missing.push('Real result');
 for(const r of recipe.results){const t=recipe.translations.find(t=>t.id===r.translationId);if(!r.asset||!r.sha256)missing.push('Real video file with verified digest');if(!text(t?.model))missing.push('Model attribution');if(!text(t?.submittedPrompt))missing.push('Exact submitted prompt');if(r.provenance.rightsStatus==='unknown'||!text(r.provenance.confirmedBy)||!text(r.provenance.source))missing.push('Publication rights and source confirmation');}
 return [...new Set(missing)];
}
export const isPublished=(r:Recipe)=>r.status==='published'&&readiness(r).length===0;
export const recipePath=(r:Recipe)=>`/recipes/${r.slug}`;
export function promptForResult(recipe:Recipe,resultId:string){const result=recipe.results.find(r=>r.id===resultId);return recipe.translations.find(t=>t.id===result?.translationId)?.submittedPrompt??null;}
export function copyRecipeText(recipe:Recipe){return ['FRAMEFIELD RECIPE / v1',`${recipe.title} [${recipe.id}]`,'',...recipe.controls.flatMap((item,index)=>{const c=controls.find(c=>c.id===item.controlId)!;return [`${String(index+1).padStart(2,'0')} / ${c.category.toUpperCase()} / ${c.name}`,`Control ID: ${c.id}`,...Object.entries(item.parameters).map(([k,v])=>`${k}: ${v}`),''];}),...(recipe.sceneState?['SCENE / FRAMEFIELD v1',JSON.stringify(recipe.sceneState),'']:[]),...(recipe.cameraState?['CAMERA / FRAMEFIELD v1',JSON.stringify(recipe.cameraState),'']:[])].join('\n');}
export interface RemixState {version:1;sourceRecipeId:string;title:string;workingControlStack:RecipeControl[];sceneState:RecipeScene|null;cameraState:RecipeCamera|null}
export const createRemix=(recipe:Recipe):RemixState=>structuredClone({version:1,sourceRecipeId:recipe.id,title:recipe.title,workingControlStack:recipe.controls,sceneState:recipe.sceneState,cameraState:recipe.cameraState});
export const remixKey='framefield-remix-v1';
export function parseRemix(raw:string|null):RemixState|null {try{const v=JSON.parse(raw??'null');if(!record(v)||v.version!==1||!text(v.sourceRecipeId)||!text(v.title)||!validateControls(v.workingControlStack)||(v.sceneState!==null&&!validScene(v.sceneState))||(v.cameraState!==null&&!validCamera(v.cameraState)))return null;return v as unknown as RemixState;}catch{return null;}}

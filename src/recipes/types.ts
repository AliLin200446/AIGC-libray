import type { ControlId, ParameterValue } from '../controls/types';
import type { SceneAnchor } from '../library/instrument/compose-state';
export interface RecipeControl { controlId:ControlId; parameters:Record<string,ParameterValue> }
export interface RecipeScene {version:1;primarySubjectId:'subject';objects:SceneAnchor[]}
export interface RecipeCamera {position:[number,number,number];target:[number,number,number];focalLength:number;roll?:number;targetMode?:'subject'|'free';framingLock?:boolean}
export interface RecipeTranslation {id:string;model:string|null;modelVersion:string|null;submittedPrompt:string|null;settings:Record<string,string|number|boolean>|null}
export interface RecipeResult {id:string;translationId:string;mediaType:'video';asset:string|null;sha256:string|null;creatorNotes:string|null;observedBehavior:string|null;deviations:string|null;createdAt:string|null;provenance:{rightsStatus:'unknown'|'creator-owned'|'licensed';confirmedBy:string|null;source:string|null}}
export interface Recipe {version:1;id:string;slug:string;title:string;description:string|null;creator:{name:string|null;portfolio:string|null};controls:RecipeControl[];sceneState:RecipeScene|null;cameraState:RecipeCamera|null;translations:RecipeTranslation[];results:RecipeResult[];tags:string[];status:'draft'|'curated'|'published';mappingConfirmedBy:string|null;createdAt:string|null}

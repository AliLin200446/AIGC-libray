import { clips as briefs } from './data';
import type { ClipReference } from './types';
const entries=[
 ['dolly','dolly-in','Courtyard / approach','Dolly In','Smooth forward translation along the courtyard axis with a fixed viewing direction.','dolly'],
 ['tracking','tracking','Colonnade / lateral passage','Tracking','Translate laterally across the colonnade with the viewing direction held steady.','static'],
 ['pan','pan','Gallery / horizontal reveal','Pan','Rotate horizontally from one fixed camera position to reveal the gallery.','static'],
 ['orbit','orbit','Terracotta / orbit','Orbit','Move around the central sculpture on an arc, continuously aiming toward it.','static'],
] as const;
export const originalClips:ClipReference[]=entries.map(([slug,base,title,technique,movement,control])=>{
 const seed=briefs.find(c=>c.id===base)!;
 const prompt=`A continuous six-second ${technique.toLowerCase()} study in a sunlit travertine courtyard with repeated columns and terracotta sculptures. ${movement} Keep a medium-wide architectural view, level horizon, readable foreground columns and a stationary sculpture in the middle distance. Use a fixed moderate field of view and an even, restrained pace. Preserve near-to-far spatial separation and hard diagonal sunlight shadows. No cuts, zoom, camera roll, sudden acceleration, moving architecture or passage through solid surfaces.`;
 return {...seed,id:`demo-${slug}`,title,description:technique,demonstration:true,videoUrl:`/media/originals/${slug}.mp4`,posterUrl:`/media/originals/${slug}.jpg`,duration:6,prompt,categories:{cameraMovement:slug==='dolly'?['Dolly In / Out']:slug==='tracking'?['Tracking']:slug==='pan'?['Pan']:['Orbit'],composition:['Wide Shot'],lens:['Normal'],lighting:[]},
 source:{title:'Original FRAMEFIELD procedural camera demonstration',url:'/media/originals/PROVENANCE.txt',attribution:'FRAMEFIELD · original rendered scene and animation · 2026',kind:'licensed'},
 license:{name:'Original project asset',url:'/media/originals/PROVENANCE.txt',notes:'Created specifically for this prototype from original geometry; no film footage, stock imagery, downloaded media or third-party AI processing. Bundled display, playback and poster use authorized for this project.'},
 curated:{film:title,year:2026,scene:'Original rendered courtyard — not a movie scene',technique,parameters:[['Camera movement',movement],['Framing','Medium-wide architectural view'],['Subject positioning','Stationary sculptures among repeated columns'],['Lens characteristics','Fixed moderate field of view — authored virtual camera'],['Movement speed','Even pace over six seconds'],['Spatial relationships','Near columns, middle-distance sculpture, far courtyard wall'],['Lighting','Neutral directional light with diagonal shadows'],['Negative constraints','No cuts, zoom, camera roll or moving architecture']],creativeControls:{composition:'centered',movement:control},unsupported:control==='dolly'?'Dolly and centered composition transfer; the courtyard geometry does not. Compose travel and lens remain creative defaults.':'This camera motion is not supported by the focused composer. Centered composition transfers; motion remains static and is explicitly a creative default.',research:[]},
 limitations:['Original deterministic animation, not film analysis. Source renderer defines the motion; no inferred physical camera rig.']};
});
export const prototypeIds=['film-discovery-05','film-discovery-10',...originalClips.map(c=>c.id)];
export const isPrototypeReference=(c:ClipReference)=>prototypeIds.includes(c.id);

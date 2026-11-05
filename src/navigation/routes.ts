/** Canonical destinations; legacy URLs retain queries without exposing private routes. */
export function canonicalRoute(path:string,search='') {const clean=path.replace(/\/$/,'')||'/';let target=clean;const query=new URLSearchParams(search);
 if(clean==='/clips'||/^\/clips\/[^/.]+$/.test(clean))target=clean.replace('/clips','/explore');
 else if(clean==='/playground'){target='/compose';query.set('shot','1');}
 else if(clean==='/about')target='/index';
 else if(clean==='/recipes'){target='/compose';query.set('presets','1');}
 else if(clean.startsWith('/recipes/')){target='/compose';query.set('recipe',clean.slice('/recipes/'.length));}
 if(clean==='/explore'&&query.has('image')){target='/analyze';query.delete('image');}
 if(target==='/compose'){
  if(composeView('?'+query.toString())==='shot'){target='/compose/workspace';query.set('shot','1');}
  else if(!query.has('workspace')&&!query.has('presets')&&!query.has('recipe'))target='/';
 }
 return target+(query.size?'?'+query.toString():'');}
export const primaryNavigation=[['/explore','EXPLORE'],['/index','INDEX'],['/analyze','AI ANALYZE']] as const;
export function activeDestination(path:string){if(path==='/explore'||path.startsWith('/explore/')||path.startsWith('/clips'))return '/explore';if(path==='/index'||path==='/about'||path.startsWith('/library/'))return '/index';if(path==='/analyze')return '/analyze';return null;}

/** One dispatch rule for the two Compose experiences and retained tools. */
export function composeView(search:string):'instrument'|'shot'|'recipes' {const q=new URLSearchParams(search);if(q.has('workspace'))return 'instrument';if(q.has('presets')||q.has('recipe'))return 'recipes';return q.get('shot')==='1'||q.has('clip')||q.has('film')?'shot':'instrument';}

import {archiveShell,archiveFooter} from '../library/archive';
import {el} from '../library/dom';
import {mountAnalyze} from '../analyze/analyze-page';
import {httpProvider} from '../analyze/simulated-provider';
export function renderAnalyzePlaceholder(app:HTMLElement){
 archiveShell(app);document.title='AI Analyze — Framefield';
 const main=el('main','analyze-page');main.dataset.ffNoTrail='';main.style.marginInline='-4vw';app.append(main,archiveFooter());
 const dispose=mountAnalyze(main,{
  provider:httpProvider('/api/analyze'),
  live:true,
  samples:[{name:'Colonnade',src:'/media/originals/tracking.jpg'},{name:'Gallery',src:'/media/originals/pan.jpg'},{name:'Courtyard',src:'/media/originals/dolly.jpg'},{name:'Terracotta',src:'/media/originals/orbit.jpg'}],
  retention:'Click Analyze to send this image to NVIDIA NIM for Meta Muse Glimmer analysis. FRAMEFIELD processes images in memory and does not save them. NVIDIA service terms apply.',
  controlHref:slug=>`/library/${slug}`,
  composeHref:'/compose/workspace?from=analyze',
 });
 window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});import.meta.hot?.dispose(dispose);
}

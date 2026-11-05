import { controls } from '../controls';
import { el } from './dom';
import { archiveShell, archiveFooter } from './archive';
import { toIndexModel } from '../index/index-adapter';
import { renderIndexPage } from '../index/index-page';

export function renderCatalog(app: HTMLElement) {
  archiveShell(app); document.title = 'Index — Framefield';
  const main=el('main','index-main');
  app.append(main,archiveFooter());
  const dispose=renderIndexPage(main,toIndexModel(controls));
  const anchor=location.hash.slice(1);
  const family=['camera','lens','composition'].find(id=>anchor===id||anchor===`ix-fam-${id}`);
  if(family)requestAnimationFrame(()=>document.getElementById(`ix-fam-${family}`)?.scrollIntoView());
  window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();},{once:true});
  import.meta.hot?.dispose(dispose);
  return dispose;
}

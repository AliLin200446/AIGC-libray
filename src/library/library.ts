import {el} from './dom';
import {archiveShell,archiveFooter,renderUnavailable} from './archive';
import {toControlModels,controlComposeHref} from '../controls/control-adapter';
import {renderControlPage,pageModelFor} from '../controls/control-page';
import {mountControlStudy} from '../controls/control-study';
export function renderLibrary(app:HTMLElement):void {
 const slug=location.pathname.replace(/\/$/,'').slice('/library/'.length);
 const model=pageModelFor(toControlModels(),slug,{indexHref:'/index',experimentNeeds:['The same control configuration','Comparable input and settings','Repeated paired generations'],composeHref:controlComposeHref});
 if(!model){renderUnavailable(app,'Control not found');return;}
 archiveShell(app);document.title=`${model.control.title} — Framefield`;
 const main=el('main','control-page');app.append(main,archiveFooter());
 const dispose=renderControlPage(main,model,{mountStudy:mountControlStudy});
 window.addEventListener('pagehide',event=>{if(!event.persisted)dispose();});import.meta.hot?.dispose(dispose);
}

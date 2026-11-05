import {logoGlyph} from '../pixel/pixel';
import {el,link} from '../library/dom';
import {activeDestination,primaryNavigation} from './routes';

/** One public header. Route render, not retained component state, determines selection. */
export function GlobalNavbar(pathname=location.pathname):HTMLElement {
 const header=el('header','global-navbar');
 header.dataset.ffNoTrail='';
 const logo=link('/','FRAMEFIELD','wordmark');logo.prepend(logoGlyph());
 logo.setAttribute('aria-label','FRAMEFIELD — Main Page');
 const nav=el('nav','global-navbar__links');nav.setAttribute('aria-label','Main navigation');
 for(const[href,label]of primaryNavigation){
  const item=link(href,label);
  if(activeDestination(pathname)===href)item.setAttribute('aria-current','page');
  nav.append(item);
 }
 header.append(logo,nav);
 return header;
}

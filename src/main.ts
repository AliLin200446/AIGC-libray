import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import { mountPixelTheme } from './pixel/pixel';
import { initPixelInteractions } from './pixel/interactions';
import pixelInteractionsCSS from './styles/pixel-interactions.css?inline';
import pixelThemeCSS from './styles/pixel-theme.css?inline';
// Route bundles own their legacy CSS. Append the supplied override after they load,
// before render constructs a Three.js palette. Also handle late-loaded panels.
const theme = document.createElement('style');
theme.dataset.framefieldTheme = 'pixel-r1';
theme.textContent = pixelThemeCSS + '\n' + pixelInteractionsCSS;
applyPixelStyles();
const disposeInteractions = initPixelInteractions();
import.meta.hot?.dispose(() => { disposeInteractions(); disposePixels(); pixelMounts.disconnect(); themeOrder.disconnect(); theme.remove(); });
function applyPixelStyles() { if (document.head.lastElementChild !== theme) document.head.append(theme); }
let disposePixels = () => {};
function refreshPixels() { disposePixels(); disposePixels = mountPixelTheme(); }
const themeOrder = new MutationObserver(applyPixelStyles);
themeOrder.observe(document.head, { childList: true });
const pixelMounts = new MutationObserver(refreshPixels);
window.addEventListener('pagehide', event => { if (!event.persisted) { disposeInteractions(); disposePixels(); pixelMounts.disconnect(); themeOrder.disconnect(); } });
const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing application mount point.');
const path = window.location.pathname.replace(/\/$/, '') || '/';
async function unavailable(message: string) {
  const { renderUnavailable } = await import('./library/archive'); applyPixelStyles(); renderUnavailable(app!, message);
}
async function start() {
  if (import.meta.env.DEV && path === '/admin/references') {
    const { renderFilmReferences } = await import('./dev/film-references'); applyPixelStyles(); await renderFilmReferences(app!);
  } else if (import.meta.env.DEV && path === '/dev/clip-ingestion') {
    const { renderClipIngestion } = await import('./dev/clip-ingestion'); applyPixelStyles(); await renderClipIngestion(app!);
  } else if (import.meta.env.DEV && path === '/dev/recipes') {
    const { renderRecipeIngest } = await import('./dev/recipes'); applyPixelStyles(); await renderRecipeIngest(app!);
  } else if (path === '/clips' || path.startsWith('/clips/')) {
    const { renderClips } = await import('./clips/pages'); applyPixelStyles(); renderClips(app!);
  } else if (path === '/index') {
    const { renderCatalog } = await import('./library/catalog'); applyPixelStyles(); renderCatalog(app!);
  } else if (path === '/recipes' || path.startsWith('/recipes/')) {
    const { renderRecipes } = await import('./recipes/pages'); applyPixelStyles(); renderRecipes(app!);
  } else if (import.meta.env.DEV && path === '/dev/reference-curation') {
    const { renderReferenceCuration } = await import('./dev/reference-curation'); applyPixelStyles(); renderReferenceCuration(app!);
  } else if (import.meta.env.DEV && path === '/dev/controls') {
    const { renderInspection } = await import('./dev/inspection'); applyPixelStyles(); renderInspection(app!);
  } else if (path === '/' || path === '/library') {
    if (path === '/library') history.replaceState(null, '', '/' + window.location.search + window.location.hash);
    const { renderInstrument } = await import('./library/instrument/home'); applyPixelStyles(); renderInstrument(app!);
  } else if (path.startsWith('/library/')) {
    const { renderLibrary } = await import('./library/library'); applyPixelStyles(); renderLibrary(app!);
  } else unavailable('Page not found');
}
void start().catch(() => unavailable('Framefield could not load. Please reload or try again later.')).finally(() => { refreshPixels(); pixelMounts.observe(app!, { childList: true, subtree: true }); });

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing application mount point.');
const path = window.location.pathname.replace(/\/$/, '') || '/';
function unavailable(message: string) {
  app!.replaceChildren();
  const heading = document.createElement('h1'); heading.textContent = message;
  const home = document.createElement('a'); home.href = '/'; home.textContent = 'Return to Framefield';
  app!.append(heading, home);
}
async function start() {
  if (import.meta.env.DEV && path === '/dev/controls') {
    const { renderInspection } = await import('./dev/inspection'); renderInspection(app!);
  } else if (path === '/' || path === '/library') {
    if (path === '/library') history.replaceState(null, '', '/' + window.location.search + window.location.hash);
    const { renderInstrument } = await import('./library/instrument/home'); renderInstrument(app!);
  } else if (path.startsWith('/library/')) {
    const { renderLibrary } = await import('./library/library'); renderLibrary(app!);
  } else unavailable('Page not found');
}
void start().catch(() => unavailable('Framefield could not load. Please reload or try again later.'));

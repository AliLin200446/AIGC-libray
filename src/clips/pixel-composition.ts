/** Decorative, bounded SVG layers. No animation loop, pointer listeners or canvas. */
export function pixelComposition(host: HTMLElement, variant: 'hero' | 'footer') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.classList.add('clip-pixel-composition', `clip-pixel-composition--${variant}`);
  svg.setAttribute('viewBox', '0 0 600 300');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  // Fixed pattern: density builds along a diagonal, then breaks into sparse fragments.
  for (let layer = 0; layer < 3; layer++) {
    const group = document.createElementNS(ns, 'g');
    group.classList.add('clip-pixel-layer');
    group.style.setProperty('--layer', String(layer));
    for (let col = 0; col < 29; col++) {
      for (let row = 0; row < 13; row++) {
        const hash = (col * 37 + row * 19 + layer * 53 + (variant === 'footer' ? 71 : 0)) % 101;
        const center = variant === 'hero' ? 11 - col * .31 : 3 + col * .23;
        const distance = Math.abs(row - center);
        if (distance > 3 || hash > 65 - distance * 17 || hash % 3 !== layer) continue;
        const dot = hash % 5 === 0;
        const mark = document.createElementNS(ns, dot ? 'circle' : 'rect');
        const size = hash % 9 === 0 ? 16 : hash % 4 === 0 ? 8 : 4;
        const x = 12 + col * 20, y = 12 + row * 20;
        if (dot) { mark.setAttribute('cx', String(x)); mark.setAttribute('cy', String(y)); mark.setAttribute('r', '1.5'); }
        else { mark.setAttribute('x', String(x)); mark.setAttribute('y', String(y)); mark.setAttribute('width', String(size)); mark.setAttribute('height', String(size)); }
        mark.setAttribute('fill', hash % 7 === 0 ? 'var(--ff-camera)' : hash % 11 === 0 ? 'var(--ff-lens)' : 'var(--ff-ink)');
        mark.setAttribute('opacity', String(dot ? .28 : .12 + (hash % 4) * .09));
        group.append(mark);
      }
    }
    svg.append(group);
  }
  host.classList.add(`clip-pixel-host--${variant}`);
  host.prepend(svg);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  const sync = () => svg.classList.toggle('is-running', visible && !document.hidden && !motion.matches);
  const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
  observer.observe(host);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); motion.removeEventListener('change', sync); svg.remove(); host.classList.remove(`clip-pixel-host--${variant}`); };
}

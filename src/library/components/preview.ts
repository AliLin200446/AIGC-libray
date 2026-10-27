import type { ControlSpecification } from '../../controls/types';
import type { CompositionOverlay, VisualAsset, VisualPreview } from '../../visuals/types';
import { button, el } from '../dom';

const svgNS = 'http://www.w3.org/2000/svg';
function shape(tag: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS(svgNS, tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  return node;
}
export function overlayLayer(overlays: readonly CompositionOverlay[]): SVGElement {
  const svg = shape('svg', { viewBox: '0 0 1000 625', preserveAspectRatio: 'none', class: 'composition-guides', 'aria-hidden': 'true' });
  const line = (x1: number, y1: number, x2: number, y2: number) => svg.append(shape('line', { x1: `${x1}`, y1: `${y1}`, x2: `${x2}`, y2: `${y2}` }));
  for (const overlay of overlays) {
    if (overlay.type === 'center-axis') { line(500, 0, 500, 625); line(0, 312.5, 1000, 312.5); }
    if (overlay.type === 'symmetry-axis') { if (overlay.axis === 'horizontal') line(0, 312.5, 1000, 312.5); else line(500, 0, 500, 625); }
    if (overlay.type === 'thirds-grid') { [1, 2].forEach(n => { line(n * 1000 / 3, 0, n * 1000 / 3, 625); line(0, n * 625 / 3, 1000, n * 625 / 3); }); }
    if (overlay.type === 'subject-position') svg.append(shape('ellipse', { cx: `${overlay.x * 1000}`, cy: `${overlay.y * 625}`, rx: '16', ry: '16', class: 'anchor-mark' }));
    if (overlay.type === 'negative-space') svg.append(shape('rect', { x: `${overlay.x * 1000}`, y: `${overlay.y * 625}`, width: `${overlay.width * 1000}`, height: `${overlay.height * 625}`, class: 'space-region' }));
  }
  return svg;
}

export function motionDiagram(control: ControlSpecification): SVGElement {
  const svg = shape('svg', { viewBox: '0 0 1000 625', class: 'motion-diagram', 'aria-hidden': 'true' });
  const paths: Record<string, string[]> = {
    pan: ['M190 310 H810 M780 285 L810 310 L780 335', 'M310 255 V370 M500 230 V395 M690 255 V370'],
    tilt: ['M500 445 V160 M475 190 L500 160 L525 190', 'M360 240 H640 M320 312 H680 M360 385 H640'],
    dolly: ['M250 155 H750 V470 H250 Z', 'M350 220 H650 V405 H350 Z', 'M445 280 H555 V345 H445 Z', 'M250 155 L445 280 M750 155 L555 280 M750 470 L555 345 M250 470 L445 345'],
    orbit: ['M720 350 C860 120 180 120 270 360 C310 455 690 455 750 320', 'M717 343 L750 320 L757 359', 'M500 280 V345 M468 312 H532'],
  };
  (paths[control.id] ?? []).forEach(d => svg.append(shape('path', { d })));
  return svg;
}

export function mediaElement(asset: VisualAsset, onError: () => void): HTMLElement {
  if (asset.type === 'image') {
    const img = el('img', 'study-media'); img.src = asset.src; img.alt = asset.alt; img.loading = 'lazy';
    img.addEventListener('error', onError, { once: true });
    return img;
  }
  const video = el('video', 'study-media');
  video.muted = true; video.loop = true; video.playsInline = true; video.controls = true;
  video.autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  video.preload = 'metadata'; video.src = asset.src;
  if (asset.poster) video.poster = asset.poster;
  video.setAttribute('aria-label', asset.alt);
  video.addEventListener('error', onError, { once: true });
  return video;
}

export interface PreviewView { element: HTMLElement; setOverlays(overlays: readonly CompositionOverlay[]): void }
export function visualPreview(control: ControlSpecification, options: { compact?: boolean; spec?: VisualPreview } = {}): PreviewView {
  const spec = options.spec ?? control.visualPreview;
  const figure = el('figure', `visual-preview ${control.category} preview-${control.id}${options.compact ? ' compact' : ''}`);
  const viewport = el('div', 'preview-viewport');
  const top = el('div', 'preview-top');
  top.append(el('span', '', spec.type === 'video' ? 'MOTION / 05–08 SEC' : spec.type === 'comparison' ? 'CONTROLLED COMPARISON' : 'COMPOSITION STUDY'));
  const status = el('span', 'asset-status', spec.asset ? spec.asset.evidenceStatus : 'ASSET PENDING');
  top.append(status);
  const stage = el('div', 'preview-stage');
  let guides = overlayLayer(spec.overlays);
  const bottom = el('div', 'preview-bottom');
  const requirements = el('div', 'shot-list');
  requirements.append(el('span', 'eyebrow', 'REQUIRED STUDY'));
  spec.requiredAsset.forEach(text => requirements.append(el('span', '', text)));
  function pending(failed = false) {
    stage.replaceChildren();
    stage.classList.add('pending');
    status.textContent = failed ? 'ASSET UNAVAILABLE' : 'ASSET PENDING';
    const mark = el('div', 'study-mark', control.category === 'lens' ? control.name : control.category === 'composition' ? '＋' : '');
    if (control.category === 'camera') stage.append(motionDiagram(control));
    else stage.append(mark);
    bottom.replaceChildren(el('span', '', failed ? 'Asset could not load' : spec.title), el('span', 'eyebrow', 'SCHEMATIC · NOT MODEL OUTPUT'));
    stage.append(guides);
  }
  if (spec.asset) {
    stage.append(mediaElement(spec.asset, () => pending(true)));
    bottom.append(el('span', '', spec.asset.alt), el('span', 'eyebrow', spec.asset.evidenceStatus === 'experiment' ? `RUNS: ${spec.asset.runIds.join(', ')}` : `REFERENCE: ${spec.asset.attribution}`));
  } else pending();
  stage.append(guides);
  function alignGuides() {
    const media = stage.querySelector('img, video');
    const width = media instanceof HTMLImageElement ? media.naturalWidth : media instanceof HTMLVideoElement ? media.videoWidth : 0;
    const height = media instanceof HTMLImageElement ? media.naturalHeight : media instanceof HTMLVideoElement ? media.videoHeight : 0;
    if (!width || !height) { const visible = guides.style.display; guides.removeAttribute('style'); guides.style.display = visible; return; }
    const scale = Math.min(stage.clientWidth / width, stage.clientHeight / height);
    const visible = guides.style.display;
    guides.style.cssText = `width:${width * scale}px;height:${height * scale}px;left:${(stage.clientWidth - width * scale) / 2}px;top:${(stage.clientHeight - height * scale) / 2}px;display:${visible};`;
  }
  if (spec.asset && spec.overlays.length) {
    stage.querySelector('img')?.addEventListener('load', alignGuides);
    stage.querySelector('video')?.addEventListener('loadedmetadata', alignGuides);
    new ResizeObserver(alignGuides).observe(stage);
  }
  const toolbar = el('div', 'preview-toolbar');
  if (spec.overlays.length) {
    let visible = true;
    const toggle = button('Guides on', () => { visible = !visible; guides.style.display = visible ? '' : 'none'; toggle.textContent = visible ? 'Guides on' : 'Guides off'; toggle.setAttribute('aria-pressed', String(visible)); }, 'guide-toggle');
    toggle.setAttribute('aria-pressed', 'true');
    toggle.setAttribute('aria-label', `${control.name}: toggle composition guides`);
    toolbar.append(toggle);
  }
  viewport.append(top, stage, bottom, toolbar);
  figure.append(viewport);
  if (!spec.asset) figure.append(requirements);
  return { element: figure, setOverlays(overlays) { const next = overlayLayer(overlays); next.style.cssText = guides.style.cssText; guides.replaceWith(next); guides = next; alignGuides(); } };
}

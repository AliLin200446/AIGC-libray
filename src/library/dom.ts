export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
export function link(href: string, text: string, className = ''): HTMLAnchorElement {
  const node = el('a', className, text);
  node.href = href;
  return node;
}
export function button(text: string, onClick: () => void, className = ''): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
export function heading(index: string, name: string): HTMLElement {
  const row = el('div', 'section-heading');
  row.append(el('span', 'eyebrow', index), el('h2', '', name));
  return row;
}

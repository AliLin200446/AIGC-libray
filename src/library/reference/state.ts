import { MAX_REFERENCE_BYTES, MAX_REFERENCE_PIXELS } from './errors';
import type { ReferenceImage, ReconstructionControlId } from './types';

export const MAX_IMAGE_BYTES = MAX_REFERENCE_BYTES;
export function validateImage(file: Pick<File, 'size' | 'type'>): void {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WEBP image. Video and other formats are not supported.');
  if (!file.size) throw new Error('This file is empty. Choose another image.');
  if (file.size > MAX_IMAGE_BYTES) throw new Error('This image is too large. Choose a file under 10 MB.');
}
export function addToStack(stack: ReconstructionControlId[], id: ReconstructionControlId): ReconstructionControlId[] {
  // One lens at a time; multiple composition intentions can coexist.
  return [...stack.filter(existing => existing !== id && !(id.startsWith('lens-') && existing.startsWith('lens-'))), id];
}
export interface ImageRuntime {
  create(file: Blob): string;
  revoke(url: string): void;
  decode(url: string): Promise<{ width: number; height: number }>;
}
export const browserImageRuntime: ImageRuntime = {
  create: file => URL.createObjectURL(file), revoke: url => URL.revokeObjectURL(url),
  async decode(url) {
    const image = new Image(); image.src = url;
    try { await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight }; }
    catch { throw new Error('This image could not be decoded. Try a different JPG, PNG or WEBP.'); }
    finally { image.removeAttribute('src'); }
  },
};
/** Owns every object URL, including canceled or failed decode attempts. No persistence. */
export class LocalReference {
  current: ReferenceImage | null = null;
  private version = 0;
  private pending = new Set<string>();
  constructor(private runtime: ImageRuntime = browserImageRuntime) {}
  async load(file: Blob, name: string): Promise<ReferenceImage | null> {
    const version = ++this.version;
    const url = this.runtime.create(file); this.pending.add(url);
    try {
      const dimensions = await this.runtime.decode(url);
      if (version !== this.version) return null;
      if (dimensions.width < 1 || dimensions.height < 1 || dimensions.width * dimensions.height > MAX_REFERENCE_PIXELS) throw new Error('Choose an image with valid dimensions and no more than 20 megapixels.');
      if (this.current) this.runtime.revoke(this.current.url);
      this.current = { file, name, url, ...dimensions }; this.pending.delete(url);
      return this.current;
    } finally {
      if (this.pending.delete(url)) this.runtime.revoke(url);
    }
  }
  clear(): void {
    this.version++;
    if (this.current) this.runtime.revoke(this.current.url);
    this.current = null;
    this.pending.forEach(url => this.runtime.revoke(url)); this.pending.clear();
  }
}

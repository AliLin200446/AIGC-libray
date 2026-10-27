import { filterGroups } from './types';
import type { ClipFilters, ClipReference, FilterGroup } from './types';
export const groupLabels: Record<FilterGroup, string> = { cameraMovement: 'Camera movement', composition: 'Composition', lens: 'Lens', lighting: 'Lighting' };
export const groups = Object.keys(filterGroups) as FilterGroup[];
export function parseFilters(search: string): ClipFilters {
  const params = new URLSearchParams(search);
  return Object.fromEntries(groups.map(group => [group, params.getAll(group).filter((tag, i, all) => (filterGroups[group] as readonly string[]).includes(tag) && all.indexOf(tag) === i)])) as ClipFilters;
}
/** OR within a family, AND across families. */
export function filterClips(clips: readonly ClipReference[], filters: ClipFilters) {
  return clips.filter(clip => groups.every(group => !filters[group].length || filters[group].some(tag => (clip.categories[group] as readonly string[]).includes(tag))));
}
export function filterSearch(filters: ClipFilters) {
  const params = new URLSearchParams();
  for (const group of groups) for (const tag of filters[group]) params.append(group, tag);
  return params.size ? `?${params}` : '';
}

import type {Content} from '../server/types';
/** Topic-level online controls are separate from automatic color-preview generation.
 * Older print-only-preview imports retain their existing manual Studio actions.
 * New topics explicitly requested as downloads only belong in this registry.
 */
export const DOWNLOAD_ONLY_TOPICS:ReadonlySet<string>=new Set(['elf-on-the-shelf','nutcracker','the-nightmare-before-christmas','nativity','gingerbread-man','grinch']);
export function hasOnlineColoring(item:Pick<Content,'category_ids'>):boolean{return !item.category_ids?.some(id=>DOWNLOAD_ONLY_TOPICS.has(id));}

import {NOVEMBER_13_WNBA_TOPICS} from '../taxonomy/november-13-wnba-fourteen';
import {NOVEMBER_12_NBA_TOPICS} from '../taxonomy/november-12-nba-thirty';
import type {Content} from '../server/types';
/** Topic-level online controls are separate from automatic color-preview generation.
 * Older print-only-preview imports retain their existing manual Studio actions.
 * New topics explicitly requested as downloads only belong in this registry.
 */
export const DOWNLOAD_ONLY_TOPICS:ReadonlySet<string>=new Set([...NOVEMBER_13_WNBA_TOPICS.map(t=>t.id),...NOVEMBER_12_NBA_TOPICS.map(t=>t.id),'elf-on-the-shelf','nutcracker','the-nightmare-before-christmas','nativity','gingerbread-man','grinch']);
export function hasOnlineColoring(item:Pick<Content,'category_ids'>):boolean{return !item.category_ids?.some(id=>DOWNLOAD_ONLY_TOPICS.has(id));}

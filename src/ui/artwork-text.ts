import type {Content} from '../server/types';
/** One source for image names, descriptions and text alternatives, including future imports. */
export function artworkText(item:Pick<Content,'title'|'description'|'alt'>){const title=item.title.trim();const description=item.description?.trim()||item.alt?.trim()||title;const alt=item.alt?.trim()||description;return{title,description,alt};}

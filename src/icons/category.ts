import {categoryById,categoryPath,resolveCategoryAlias} from '../taxonomy/catalog';
import {hasIllustration} from './registry';

/** Category identity drives labels and artwork together, including future imported items. */
export function categoryPresentation(id:string,label?:string) {
 const resolved=categoryById(id)||categoryById(resolveCategoryAlias(id)||'')||categoryById(resolveCategoryAlias(label||'')||'');
 const icon=resolved?.icon||(hasIllustration(id)?id:'all');
 return {id:resolved?.id||id,label:resolved?.name||label||id,icon,href:resolved?categoryPath(resolved.id):'/coloring-pages/'};
}

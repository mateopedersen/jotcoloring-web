import catalog from './catalog.json';
import {glyphs} from './glyphs';
export const ICON_SPRITE=catalog.url;
export const ICON_VIEWBOX=catalog.viewBox;
export const ICON_CATALOG=catalog.icons;
const names=new Set(catalog.icons.map(item=>item.id));
export const ICON_ALIASES:Record<string,string>={webp:'image',document:'license',magic:'ai',spark:'ai',file:'pdf',home:'all'};
export function illustrationName(name:string){const resolved=ICON_ALIASES[name]||name;return names.has(resolved)?resolved:'info';}
export function illustrationHref(name:string){return `${ICON_SPRITE}#${illustrationName(name)}`;}
export function hasIllustration(name:string){return names.has(ICON_ALIASES[name]||name);}
/** Callers supply fixed classes. Names always pass the registry, never user HTML. */
export function illustrationMarkup(name:string,css='jc-vector-icon',attribute=''){
 const safe=illustrationName(name);
 return `<svg class="${css}" data-vector-icon="${safe}" viewBox="${ICON_VIEWBOX}" fill="none" aria-hidden="true" focusable="false" ${attribute}><use href="${ICON_SPRITE}#${safe}"/></svg>`;
}
export function glyphMarkup(name:string){return `<svg class="jc-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${glyphs[name]||glyphs.info}"/></svg>`;}

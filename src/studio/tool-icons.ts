import catalog from './tool-catalog.json';
export const STUDIO_TOOL_SPRITE=catalog.url;
export const STUDIO_TOOL_NAMES=catalog.names;
/** Child-friendly tool silhouettes with shared, cacheable dimensional artwork. */
export function toolIcon(name:string){
 const safe=catalog.names.includes(name)?name:'brush';
 return `<svg class="jc-studio-tool-icon" data-studio-tool-art="${safe}" viewBox="${catalog.viewBox}" fill="none" aria-hidden="true" focusable="false"><use href="${catalog.url}#${safe}"/></svg>`;
}

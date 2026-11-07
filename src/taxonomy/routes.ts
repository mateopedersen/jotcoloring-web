/** Small shared route vocabulary; safe for filter controls without catalog prose. */
export const PUBLIC_COLLECTION_IDS=['animals','ocean','nature','characters','holidays','education','vehicles','art-patterns','everyday-life','space','faith','bible','social-media'] as const;
export const isPublicCollection=(id:string)=>(PUBLIC_COLLECTION_IDS as readonly string[]).includes(id);
/** Lightweight route vocabulary for client controls; source membership stays in catalog. */
export const ROOT_COLLECTION_IDS=['animals','flowers','fantasy','mandalas','holidays','vehicles','space','ocean','food','dinosaurs','nature','buildings','people','education','sports','objects','music','fashion','robots','seasons','celebrations','art-patterns','faith','bible','cartoons','dolls-toys','video-games','social-media'] as const;
export const ALL_COLORING_PAGES_PATH='/coloring-pages/all/';
export const collectionPath=(id:string)=>'/collections/'+id+'/';
export function publicCategoryPath(id:string,parent?:string|null){return parent===null||isPublicCollection(id)||(parent===undefined&&(ROOT_COLLECTION_IDS as readonly string[]).includes(id))?collectionPath(id):'/coloring-pages/'+id+'/';}
export function catalogAllPath(path:string){return path==='/coloring-pages/'?ALL_COLORING_PAGES_PATH:path.replace(/\/$/,'')+'/all/';}

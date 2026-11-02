/** Small shared route vocabulary; safe for filter controls without catalog prose. */
export const PUBLIC_COLLECTION_IDS=['animals','nature','characters','holidays','education','vehicles','art-patterns','everyday-life','space','bible'] as const;
export const isPublicCollection=(id:string)=>(PUBLIC_COLLECTION_IDS as readonly string[]).includes(id);
export const collectionPath=(id:string)=>'/collection/'+id+'/';
export function publicCategoryPath(id:string,parent:string|null=null){return !parent&&isPublicCollection(id)?collectionPath(id):'/coloring-pages/'+id+'/';}

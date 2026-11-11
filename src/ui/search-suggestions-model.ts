import {matchingSearchCollections,searchCollectionHref,type SearchCollectionOption} from '../search/collection-matches';
import {hasIllustration} from '../icons/registry';
import type {Content} from '../server/types';
type SuggestionItem=Pick<Content,'id'|'slug'|'title'|'thumbnail'|'categoryName'>&Partial<Pick<Content,'description'>>;
type Category=SearchCollectionOption;
export type Suggestion={kind:'category'|'page';title:string;detail:string;href:string;thumbnail?:string;category?:string;icon?:string;description?:string};
export function buildSuggestions(query:string,items:SuggestionItem[],categories:Category[]):Suggestion[]{
 const term=query.normalize('NFKC').trim().toLocaleLowerCase();if(term.length<2)return [];
 const groups:Suggestion[]=matchingSearchCollections(term,categories).map(c=>({kind:'category',title:c.name,detail:'Coloring Pages Collection',href:searchCollectionHref(c),category:c.id,icon:c.icon&&hasIllustration(c.icon)&&c.icon!=='info'?c.icon:'nav-all-pages'}));
 const seen=new Set<string>(),pages:Suggestion[]=[];
 for(const item of items){
  if(!item||typeof item.id!=='string'||seen.has(item.id)||typeof item.title!=='string'||!item.title.trim()||typeof item.slug!=='string'||!/^[a-z0-9-]+$/.test(item.slug))continue;
  seen.add(item.id);pages.push({kind:'page',title:item.title,detail:item.categoryName||'Coloring page',description:item.description?.trim().slice(0,160),href:`/coloring/${item.slug}/`,thumbnail:trustedThumbnail(item.thumbnail)});
  if(pages.length===5)break;
 }
 return [...groups,...pages];
}
function trustedThumbnail(value:unknown){
 if(typeof value!=='string')return;
 if(/^\/api\/media\/[a-zA-Z0-9_-]+\/[a-z_]+(?:\?[^#]*)?$/.test(value))return value;
 try{const url=new URL(value);if(url.origin==='https://assets.jotcoloring.com'&&!url.username&&!url.password&&url.pathname.startsWith('/published/')&&!url.hash)return url.href;}catch{/* Ignore malformed or untrusted image URLs. */}
}


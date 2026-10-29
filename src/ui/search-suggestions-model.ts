import {intentWords,equivalents} from '../search/intent';
import type {Content} from '../server/types';
type SuggestionItem=Pick<Content,'id'|'slug'|'title'|'thumbnail'|'categoryName'>&Partial<Pick<Content,'description'>>;
type Category={id:string;name:string};
export type Suggestion={kind:'category'|'page';title:string;detail:string;href:string;thumbnail?:string;category?:string;description?:string};
export function buildSuggestions(query:string,items:SuggestionItem[],categories:Category[]):Suggestion[]{
 const term=query.normalize('NFKC').trim().toLocaleLowerCase();if(term.length<2)return [];
 const terms=intentWords(term).flatMap(equivalents);const groups=categories.filter(c=>/^[a-z0-9-]+$/.test(c.id)&&terms.some(t=>c.name.toLocaleLowerCase().includes(t))).slice(0,2).map(c=>({kind:'category' as const,title:c.name,detail:'Category',href:`/coloring-pages/${c.id}/`,category:c.id}));
 const seen=new Set<string>(),pages:Suggestion[]=[];
 for(const item of items){
  if(!item||typeof item.id!=='string'||seen.has(item.id)||typeof item.title!=='string'||!item.title.trim()||typeof item.slug!=='string'||!/^[a-z0-9-]+$/.test(item.slug))continue;
  seen.add(item.id);pages.push({kind:'page',title:item.title,detail:item.categoryName||'Coloring page',description:item.description?.trim().slice(0,160),href:`/coloring/${item.slug}/`,thumbnail:typeof item.thumbnail==='string'&&item.thumbnail.startsWith('/api/media/')?item.thumbnail:undefined});
  if(pages.length===5)break;
 }
 return [...groups,...pages];
}

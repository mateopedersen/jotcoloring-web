import {intentWords,equivalents} from '../search/intent';
import type {Content} from '../server/types';
type SuggestionItem=Pick<Content,'id'|'slug'|'title'|'thumbnail'|'categoryName'>&Partial<Pick<Content,'description'>>;
type Category={id:string;name:string;href?:string;aliases?:string[]};
export type Suggestion={kind:'category'|'page';title:string;detail:string;href:string;thumbnail?:string;category?:string;description?:string};
export function buildSuggestions(query:string,items:SuggestionItem[],categories:Category[]):Suggestion[]{
 const term=query.normalize('NFKC').trim().toLocaleLowerCase();if(term.length<2)return [];
 const words=intentWords(term),normalize=(text:string)=>text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const groups=categories.flatMap(c=>{
  if(!/^[a-z0-9-]+$/.test(c.id))return [];
  const names=[c.name,...(c.aliases||[])].map(normalize),exact=names.includes(normalize(term));
  const matches=names.filter(name=>words.every((word,index)=>equivalents(word).some(t=>name.split(' ').some(token=>token===t||(index===words.length-1&&t.length>=2&&token.startsWith(t))))));
  if(!words.length||!matches.length)return [];
  const href=c.href||`/coloring-pages/${c.id}/`;if(!/^\/coloring-pages\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)?$/.test(href))return [];
  return [{score:exact?200:matches.some(name=>name.startsWith(normalize(term)))?100:50,item:{kind:'category' as const,title:c.name,detail:'Collection',href,category:c.id}}];
 }).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title,'en-US')).slice(0,2).map(c=>c.item);
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

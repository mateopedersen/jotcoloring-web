import {canonicalSubject,intentWords} from './intent';
import {publicCategoryPath} from '../taxonomy/routes';

export interface SearchCollectionOption {id:string;name:string;href?:string;aliases?:readonly string[];icon?:string;topic?:string;parent?:string|null;roots?:string[]}
const words=(text:string)=>intentWords(text).map(canonicalSubject);
const phrase=(haystack:string[],needle:string[])=>needle.length>0&&haystack.some((_,i)=>needle.every((word,j)=>haystack[i+j]===word));
export const searchCollectionHref=(option:SearchCollectionOption)=>option.href||publicCategoryPath(option.id);
const validHref=(value:string)=>/^(?:\/collections?\/[a-z0-9-]+\/|\/coloring-pages\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)?)$/.test(value);

/** The first result limit bounds matches, never the taxonomy being searched. */
export function parseSearchCollectionOptions(value:unknown):SearchCollectionOption[]{
 if(!Array.isArray(value))return [];
 const found=new Map<string,SearchCollectionOption>();
 for(const item of value){
  if(!item||typeof item.id!=='string'||!/^[a-z0-9-]{1,128}$/.test(item.id)||typeof item.name!=='string'||!item.name.trim())continue;
  const option:SearchCollectionOption={id:item.id,name:item.name,topic:typeof item.topic==='string'?item.topic:undefined,parent:typeof item.parent==='string'?item.parent:undefined,
   href:typeof item.href==='string'?item.href:undefined,icon:typeof item.icon==='string'?item.icon:undefined,
   aliases:Array.isArray(item.aliases)?item.aliases.filter((a:unknown)=>typeof a==='string'&&a.length<=160):[]};
  if(validHref(searchCollectionHref(option)))found.set(option.id,option);
 }
 return [...found.values()];
}
type Prepared={option:SearchCollectionOption;primary:string[][];names:string[][]};
const prepared=new WeakMap<readonly SearchCollectionOption[],Prepared[]>();
export function matchingSearchCollections(query:string,options:readonly SearchCollectionOption[],limit=3):SearchCollectionOption[]{
 // Two letters can be an unfinished name (for example "by" → BYD), even
 // when the same letters are a stopword inside a complete sentence.
 const terms=words(query);if(!terms.length&&/^[a-z]{2}$/i.test(query.trim()))terms.push(query.trim().toLowerCase());if(!terms.length)return [];
 let entries=prepared.get(options);
 if(!entries){entries=options.filter(option=>validHref(searchCollectionHref(option))).map(option=>{
  const primary=[option.name,option.topic||'',option.id].map(words).filter(p=>p.length);
  return{option,primary,names:[...primary,...(option.aliases||[]).map(words).filter(p=>p.length)]};
 });prepared.set(options,entries);}
 const key=terms.join(' '),ranked=entries.flatMap(({option,primary,names})=>{
  let score=primary.some(name=>name.join(' ')===key)?1400:0;
  for(const name of names){
   if(name.join(' ')===key)score=Math.max(score,1000+name.length*10);
   else if(terms.every((word,i)=>name.some(token=>token===word||(i===terms.length-1&&word.length>=2&&!/^\d+$/.test(word)&&token.startsWith(word)))))score=Math.max(score,800+terms.length*10);
  }
  for(const name of primary)if(phrase(terms,name))score=Math.max(score,600+name.length*40+(option.parent==='cars'?300:0));
  for(const name of names)if(phrase(terms,name))score=Math.max(score,520+name.length*40);
  return score?[{option,score}]:[];
 }).sort((a,b)=>b.score-a.score||a.option.name.localeCompare(b.option.name,'en-US'));
 const minimum=(ranked[0]?.score||0)*.8;
 return ranked.filter(result=>result.score>=minimum).slice(0,limit).map(result=>result.option);
}

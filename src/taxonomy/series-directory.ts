import {COLORING_TAXONOMY,categoryPath} from './catalog';
import {NAVIGATION_COLLECTIONS,collectionPath} from './navigation';
import {numberTopic,NUMBER_INTROS} from './number-topics';
import {landingIdentity} from './landing-identity';
import {catalogLocation,type CatalogLocation} from './catalog-location';
export interface SeriesEntry {id:string;name:string;path:string;icon:string;intro:string;count:number;roots:string[];number?:number;coverId?:string}
export interface NumberSeries {number:string;count:number;cover_id:string|null}
export function seriesDirectory(location:CatalogLocation,counts:{id:string;count:number}[],numbers:NumberSeries[]=[],groupTotals:Record<string,number>={}):SeriesEntry[]{
 if(location.number||location.allPages)return [];
 const totals=new Map(counts.map(row=>[row.id,row.count])),group=location.collection,topic=location.topic;
 if(!group&&!topic)return NAVIGATION_COLLECTIONS.flatMap(c=>{const count=groupTotals[c.id]||0;return count>0?[{...c,path:collectionPath(c.id),count}]:[];});
 let topics=group?COLORING_TAXONOMY.filter(t=>group.roots.includes(t.id)||t.parent===group.id):COLORING_TAXONOMY.filter(t=>t.parent===topic?.id);
 const includeNumbers=group?.id==='education'||topic?.id==='numbers';
 const numerals=includeNumbers?numbers.flatMap(row=>{const n=numberTopic(row.number);return n&&row.count>0?[{id:n.id,name:n.name,path:n.path,icon:'education',intro:NUMBER_INTROS[n.number],count:row.count,roots:['numbers'],number:n.number,coverId:row.cover_id||undefined}]:[];}).sort((a,b)=>a.number-b.number):[];
 if(numerals.length)topics=topics.filter(t=>t.id!=='numbers');
 const entries:SeriesEntry[]=topics.flatMap(t=>{const path=categoryPath(t.id),count=totals.get(t.id)||0,identity=catalogLocation(path);return path!==location.path&&count>0&&identity?[{id:t.id,name:t.name,path,icon:t.icon,intro:landingIdentity(identity).intro,count,roots:[t.id]}]:[];});
 const seen=new Set<string>();return [...numerals,...entries].filter(entry=>{if(seen.has(entry.path)||entry.path===location.path)return false;seen.add(entry.path);return true;});
}
/** Compact cards retain accepted subject observations, not invented visual details. */
export function seriesCaption(intro:string){
 const text=intro.replace(/\s+/gu,' ').trim();
 let first=text;
 for(const boundary of text.matchAll(/[.!?](?:["”’')\]]*)\s+/gu)){
  if(boundary[0].startsWith('.')){
   const token=text.slice(0,boundary.index).match(/(?:[A-Za-z]\.)*[A-Za-z]+$/u)?.[0]||'';
   // A title or initial is part of the accepted subject, not a one-word caption.
   if(/^(?:st|mr|mrs|ms|dr|prof|sr|jr|rev|fr|gen|sgt|capt|lt|col|no|fig|vs|etc|e\.g|i\.e)$/iu.test(token)||/^(?:[A-Z]\.)*[A-Z]$/u.test(token))continue;
  }
  first=text.slice(0,boundary.index+boundary[0].trimEnd().length);
  break;
 }
 return first.length<=170?first:first.slice(0,167).replace(/\s+\S*$/u,'')+'…';
}

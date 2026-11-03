import {NAVIGATION_COLLECTIONS} from '../taxonomy/navigation';
import {canonicalNumberSubject} from '../taxonomy/number-topics';
import {seriesDirectory,type NumberSeries} from '../taxonomy/series-directory';
import type {CatalogLocation} from '../taxonomy/catalog-location';
import type {CatalogRepository} from './catalog';
import type {Content,Env} from './types';
export async function loadSeriesDirectory(env:Env,repo:CatalogRepository,location:CatalogLocation,counts:{id:string;count:number}[]){
 let numbers:NumberSeries[]=[],groupTotals:Record<string,number>={};const db=env.CATALOG_DB;
 if(!db||location.number)return [];
 if(location.collection?.id==='education'||location.topic?.id==='numbers'){
  numbers=(await db.prepare(`SELECT (${canonicalNumberSubject()}) AS number,COUNT(*) AS count,MIN(CASE WHEN EXISTS(SELECT 1 FROM asset a WHERE a.content_id=c.id AND a.content_version=c.active_version AND a.role='catalog_thumb_bw' AND a.verified=1) THEN c.id END) AS cover_id FROM content c WHERE c.status='published' AND c.active_version IS NOT NULL AND c.example_only=0 AND EXISTS(SELECT 1 FROM content_category cc WHERE cc.content_id=c.id AND cc.category_id='numbers') GROUP BY number`).all<NumberSeries>()).results;
 }
 if(!location.collection&&!location.topic){
  const groups=NAVIGATION_COLLECTIONS.map(c=>({id:c.id,roots:c.roots}));
  const rows=(await db.prepare("SELECT json_extract(g.value,'$.id') AS id,COUNT(DISTINCT c.id) AS count FROM json_each(?) g JOIN json_each(g.value,'$.roots') root JOIN content_category cc ON cc.category_id=root.value JOIN content c ON c.id=cc.content_id WHERE c.status='published' AND c.active_version IS NOT NULL AND c.example_only=0 GROUP BY json_extract(g.value,'$.id')").bind(JSON.stringify(groups)).all<{id:string;count:number}>()).results;
  groupTotals=Object.fromEntries(rows.map(row=>[row.id,row.count]));
 }
 const entries=seriesDirectory(location,counts,numbers,groupTotals),covers=new Map<string,Content>();
 const roots=[...new Set(entries.filter(entry=>!entry.number).flatMap(entry=>entry.roots))];
 for(let offset=0;offset<roots.length;offset+=40){const batch=roots.slice(offset,offset+40),images=await repo.categoryCovers(batch);batch.forEach((id,index)=>{if(images[index])covers.set(id,images[index]!);});}
 const ids=[...new Set(entries.flatMap(entry=>entry.coverId?[entry.coverId]:[]))];
 for(let offset=0;offset<ids.length;offset+=40){const batch=ids.slice(offset,offset+40),images=await repo.getMany(batch);batch.forEach((id,index)=>{if(images[index])covers.set(id,images[index]!);});}
 return entries.map(entry=>({...entry,cover:(entry.coverId?covers.get(entry.coverId):undefined)||entry.roots.map(id=>covers.get(id)).find(Boolean)}));
}

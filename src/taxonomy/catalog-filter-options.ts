import {categoryById,COLORING_TAXONOMY} from './catalog';
import {collectionForRoot,NAVIGATION_COLLECTIONS} from './navigation';
import type {CatalogQuery} from '../server/types';

const topicValue=(topic:{id:string;parent:string|null})=>(topic.parent?topic.parent+'/':'')+topic.id;

/** Include descendants at every depth and always render the active scope. */
export function catalogFilterOptions(query:CatalogQuery,category:string,counts:{id:string;count:number}[]){
 const selectedTopic=categoryById(query.subcategory||query.category||category);
 const selectedCategory=query.number?'number-'+query.number:query.collection||
  (selectedTopic?topicValue(selectedTopic):category);
 const totals=new Map(counts.map(c=>[c.id,c.count]));
 const groups=NAVIGATION_COLLECTIONS.map(collection=>({
  ...collection,
  topics:COLORING_TAXONOMY.filter(topic=>topic.id!==collection.id&&
   collectionForRoot(topic.id)?.id===collection.id&&
   ((totals.get(topic.id)||0)>0||topicValue(topic)===selectedCategory))
   .map(topic=>({...topic,value:topicValue(topic)}))
   .sort((a,b)=>a.name.localeCompare(b.name,'en'))
 })).filter(collection=>collection.roots.some(id=>(totals.get(id)||0)>0)||
  collection.topics.length>0||selectedCategory===collection.id);
 return {selectedTopic,selectedCategory,groups};
}

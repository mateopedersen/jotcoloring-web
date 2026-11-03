import {numberSubjects} from '../search/number-subjects';
import {categoryById,categoryPath} from './catalog';
import {navigationCollection,collectionPath,collectionForRoot} from './navigation';
import {numberTopic} from './number-topics';
export function catalogLocation(pathname:string){
 const parts=pathname.split('/').filter(Boolean);
 if(parts[0]==='collection'&&parts.length===2){const collection=navigationCollection(parts[1]);return collection?{collection,path:collectionPath(collection.id)}:undefined;}
 if(parts[0]!=='coloring-pages')return;
 if(parts.length===1)return{path:'/coloring-pages/'};
 if(parts.length===3&&parts[1]==='numbers'){const number=numberTopic(parts[2]);return number?{number,path:number.path}:undefined;}
 let id=parts[1];
 if(parts.length===3){
  const legacy=parts[1]==='education'&&parts[2].match(/^(?:numbers?|number-)([1-9]\d*)$/);if(legacy){const number=numberTopic(legacy[1]);return number?{number,path:number.path}:undefined;}
  const candidate=categoryById(parts[2]);if(candidate?.parent!==parts[1]&&!(parts[1]==='animals'&&parts[2]==='dinosaurs'))return;id=parts[2];
 }else if(parts.length!==2)return;
 const topic=categoryById(id);if(!topic)return;
 const collection=!topic.parent?navigationCollection(topic.id):undefined;
 return collection?{collection,path:collectionPath(collection.id)}:{topic,path:categoryPath(topic.id)};
}
export type CatalogLocation=NonNullable<ReturnType<typeof catalogLocation>>;
/** Canonicalize legacy paths and exact scoped number searches in one hop. */
export function catalogRedirect(url:URL){
 const location=catalogLocation(url.pathname);if(!location)return;
 const target=new URL(url);
 const words=(url.searchParams.get('q')||'').toLowerCase().trim().split(/[\s-]+/).filter(Boolean),subjects=numberSubjects(words);
 const number=location.topic?.id==='numbers'&&subjects.length===1&&subjects[0].start===0&&subjects[0].end===words.length?numberTopic(subjects[0].number):undefined;
 target.pathname=number?.path||location.path;if(number)target.searchParams.delete('q');const current=location.collection?.id||collectionForRoot(location.topic?.parent||location.topic?.id||(location.number?'education':''))?.id;if(target.searchParams.get('category')===current||target.searchParams.get('category')===location.topic?.id||target.searchParams.get('category')===location.topic?.parent||!current&&target.searchParams.get('category')==='')target.searchParams.delete('category');
 return target.pathname+target.search!==url.pathname+url.search?target.pathname+target.search+target.hash:undefined;
}

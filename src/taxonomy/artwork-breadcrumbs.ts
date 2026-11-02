import {categoryById,categoryPath} from './catalog';import {collectionForRoot,collectionPath} from './navigation';import {numberTopicForArt} from './number-topics';
export function artworkBreadcrumbs(item:{title:string;slug:string;category:string;categoryName:string;subcategory?:string|null;category_ids?:string[];tags?:string[]}){
 const result=[{name:'Home',path:'/'}],group=collectionForRoot(item.category),number=numberTopicForArt(item);
 if(group)result.push({name:group.name,path:collectionPath(group.id)});
 const subject=categoryById(item.subcategory||item.category);
 if(number)result.push({name:'Numbers & Counting',path:categoryPath('numbers')},{name:number.name,path:number.path});
 else if(subject&&categoryPath(subject.id)!==result.at(-1)?.path)result.push({name:subject.name,path:categoryPath(subject.id)});
 result.push({name:item.title,path:'/coloring/'+item.slug+'/'});return result;
}

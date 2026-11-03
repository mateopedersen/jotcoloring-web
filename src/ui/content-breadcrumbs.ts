import {categoryById,categoryPath} from '../taxonomy/catalog';
import {collectionForRoot,collectionPath} from '../taxonomy/navigation';
import {numberTopicForArt} from '../taxonomy/number-topics';
export interface BreadcrumbContent {slug:string;title:string;category:string;categoryName:string;category_ids?:string[];subcategory?:string|null;tags?:string[]}
export interface ContentCrumb {name:string;path:string}
/** Both visible links and schema follow reviewed memberships and real subject URLs. */
export function contentBreadcrumbs(item:BreadcrumbContent):ContentCrumb[]{
 const crumbs:ContentCrumb[]=[{name:'Home',path:'/'}],group=collectionForRoot(item.category),root=categoryById(item.category);
 if(group)crumbs.push({name:group.name,path:collectionPath(group.id)});
 if(root&&categoryPath(root.id)!==crumbs.at(-1)?.path)crumbs.push({name:root.name,path:categoryPath(root.id)});
 const members=new Set(item.category_ids||[]);
 const child=[item.subcategory,...members].filter((id):id is string=>!!id).map(categoryById).find(c=>c?.parent===item.category&&members.has(c.id));
 const number=child?.id==='numbers'?numberTopicForArt(item):undefined;
 if(child&&!number)crumbs.push({name:child.name,path:categoryPath(child.id)});
 if(number)crumbs.push({name:number.name,path:number.path});
 crumbs.push({name:item.title,path:`/coloring/${item.slug}/`});return crumbs.filter((crumb,index)=>crumbs.findIndex(c=>c.path===crumb.path)===index);
}

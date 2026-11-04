import {categoryById,categoryPath} from './catalog';
import {collectionForRoot,collectionPath} from './navigation';
import type {CatalogLocation} from './catalog-location';
/** Visible navigation and schema use one hierarchy with unique targets. */
export function catalogBreadcrumbs(location:CatalogLocation){
 const root=location.topic?.parent||location.topic?.id||(location.number?'education':''),group=location.collection||collectionForRoot(root);
 const crumbs=[{name:'Home',path:'/'},{name:'Coloring Pages',path:'/coloring-pages/'}];
 if(group)crumbs.push({name:group.name,path:collectionPath(group.id)});
 if(location.topic?.parent){const parent=categoryById(location.topic.parent);if(parent)crumbs.push({name:parent.name,path:categoryPath(parent.id)});}
 if(location.topic)crumbs.push({name:location.topic.name,path:categoryPath(location.topic.id)});
 if(location.number)crumbs.push({name:'Numbers & Counting',path:categoryPath('numbers')},{name:location.number.name,path:location.number.path});
 if(location.allPages)crumbs.push({name:'All Coloring Pages',path:location.path});
 return crumbs.filter((crumb,index)=>crumbs.findIndex(c=>c.path===crumb.path)===index);
}

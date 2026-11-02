import {artworkBreadcrumbs} from '../taxonomy/artwork-breadcrumbs';
import {categoryPath} from '../taxonomy/catalog';
import {catalogLocation} from '../taxonomy/catalog-location';
import {collectionForRoot,collectionPath} from '../taxonomy/navigation';
import {ageBand} from '../age/model';
export interface PageSEO {origin:string;canonical:string;title:string;description:string;image:string;imageAlt:string;item?:{slug:string;title:string;category:string;categoryName:string;subcategory?:string|null;category_ids?:string[];tags?:string[]};}
/** One canonical URL and descriptive identity for HTML, social cards and JSON-LD. */
export function pageSchema(input:PageSEO){
 const origin=new URL(input.origin).origin,url=new URL(input.canonical,origin),path=url.pathname;
 const title=input.title.replace(/\s*[|—·]\s*JotColoring\s*$/,'').trim();
 const absolute=(p:string)=>new URL(p,origin).href;
 const crumbs:{name:string;path:string}[]=[{name:'Home',path:'/'}];
 if(path.startsWith('/coloring/')&&input.item){crumbs.splice(0,crumbs.length,...artworkBreadcrumbs(input.item));}
 else if(path.startsWith('/coloring-pages/')||path.startsWith('/collection/')){const view=catalogLocation(path);crumbs.push({name:'Coloring pages',path:'/coloring-pages/'});if(view){const root=view.topic?.parent||view.topic?.id||(view.number?'education':undefined),group=view.collection||(root?collectionForRoot(root):undefined);if(group)crumbs.push({name:group.name,path:collectionPath(group.id)});if(view.topic)crumbs.push({name:view.topic.name,path:categoryPath(view.topic.id)});if(view.number)crumbs.push({name:'Numbers & Counting',path:categoryPath('numbers')},{name:view.number.name,path:view.number.path});}}
 else if(path.startsWith('/coloring-by-age/')){crumbs.push({name:'Coloring by age',path:'/coloring-by-age/'});const band=ageBand(path.split('/')[2]);if(band)crumbs.push({name:band.label,path});}
 else if(path!=='/')crumbs.push({name:title,path});
 const page={'@type':path.startsWith('/collection/')||path.startsWith('/coloring-pages/')||path.startsWith('/coloring-by-age/')?'CollectionPage':'WebPage','@id':url.href+'#webpage',url:url.href,name:title,description:input.description,inLanguage:'en-US',isPartOf:{'@id':origin+'/#website'},publisher:{'@id':origin+'/#organization'},primaryImageOfPage:{'@type':'ImageObject',contentUrl:absolute(input.image),caption:input.imageAlt}};
 return{'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':origin+'/#organization',name:'JotColoring',url:origin+'/',logo:absolute('/logo-3d.webp')},{'@type':'WebSite','@id':origin+'/#website',name:'JotColoring',url:origin+'/',inLanguage:'en-US',publisher:{'@id':origin+'/#organization'}},page,...(crumbs.length>1?[{'@type':'BreadcrumbList','@id':url.href+'#breadcrumbs',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:absolute(c.path)}))}]:[])]};
}

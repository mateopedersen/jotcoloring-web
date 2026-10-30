import {childCategories} from '../taxonomy/catalog';
import {categories} from '../ui/categories';
import {ageBand} from '../age/model';
export interface PageSEO {origin:string;canonical:string;title:string;description:string;image:string;imageAlt:string;item?:{slug:string;title:string;category:string;categoryName:string};}
/** One canonical URL and descriptive identity for HTML, social cards and JSON-LD. */
export function pageSchema(input:PageSEO){
 const origin=new URL(input.origin).origin,url=new URL(input.canonical,origin),path=url.pathname;
 const title=input.title.replace(/\s*[|—·]\s*JotColoring\s*$/,'').trim();
 const absolute=(p:string)=>new URL(p,origin).href;
 const crumbs:{name:string;path:string}[]=[{name:'Home',path:'/'}];
 if(path.startsWith('/coloring/')&&input.item){crumbs.push({name:input.item.categoryName,path:`/coloring-pages/${input.item.category}/`},{name:input.item.title,path});}
 else if(path.startsWith('/coloring-pages/')){const parts=path.split('/').filter(Boolean);crumbs.push({name:'Coloring pages',path:'/coloring-pages/'});const category=categories.find(c=>c.id===parts[1]);if(category)crumbs.push({name:category.name,path:`/coloring-pages/${category.id}/`});const sub=category&&childCategories(category.id).find(c=>c.id===parts[2]);if(sub)crumbs.push({name:sub.name,path});}
 else if(path.startsWith('/coloring-by-age/')){crumbs.push({name:'Coloring by age',path:'/coloring-by-age/'});const band=ageBand(path.split('/')[2]);if(band)crumbs.push({name:band.label,path});}
 else if(path!=='/')crumbs.push({name:title,path});
 const page={'@type':path.startsWith('/coloring-pages/')||path.startsWith('/coloring-by-age/')?'CollectionPage':'WebPage','@id':url.href+'#webpage',url:url.href,name:title,description:input.description,inLanguage:'en-US',isPartOf:{'@id':origin+'/#website'},publisher:{'@id':origin+'/#organization'},primaryImageOfPage:{'@type':'ImageObject',contentUrl:absolute(input.image),caption:input.imageAlt}};
 return{'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':origin+'/#organization',name:'JotColoring',url:origin+'/',logo:absolute('/logo-3d.webp')},{'@type':'WebSite','@id':origin+'/#website',name:'JotColoring',url:origin+'/',inLanguage:'en-US',publisher:{'@id':origin+'/#organization'}},page,...(crumbs.length>1?[{'@type':'BreadcrumbList','@id':url.href+'#breadcrumbs',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:absolute(c.path)}))}]:[])]};
}

import {contentBreadcrumbs} from '../ui/content-breadcrumbs';
import {catalogLocation} from '../taxonomy/catalog-location';
import {ageBand} from '../age/model';
import {catalogBreadcrumbs} from '../taxonomy/catalog-breadcrumbs';
import {PHOTO_FAQ} from './catalog-copy';
export interface PageSEO {origin:string;canonical:string;title:string;description:string;image:string;imageAlt:string;item?:{slug:string;title:string;category:string;categoryName:string;subcategory?:string|null;category_ids?:string[];tags?:string[]};}
/** One canonical URL and descriptive identity for HTML, social cards and JSON-LD. */
export function pageSchema(input:PageSEO){
 const origin=new URL(input.origin).origin,url=new URL(input.canonical,origin),path=url.pathname;
 const title=input.title.replace(/\s*[|—·]\s*JotColoring\s*$/,'').trim();
 const absolute=(p:string)=>new URL(p,origin).href;
 const crumbs:{name:string;path:string}[]=[{name:'Home',path:'/'}];
 if(path.startsWith('/coloring/')&&input.item){crumbs.splice(0,crumbs.length,...contentBreadcrumbs(input.item));}
 else if(/^\/(?:coloring-pages|collections?)\//.test(path)){const view=catalogLocation(path);if(view)crumbs.splice(0,crumbs.length,...catalogBreadcrumbs(view));}
 else if(path.startsWith('/coloring-by-age/')){crumbs.push({name:'Coloring by age',path:'/coloring-by-age/'});const band=ageBand(path.split('/')[2]);if(band)crumbs.push({name:band.label,path});}
 else if(path!=='/')crumbs.push({name:title,path});
 const photo=path==='/create/photo/';
 const page={'@type':/^\/(?:collections?|coloring-pages|coloring-by-age)\//.test(path)?'CollectionPage':'WebPage','@id':url.href+'#webpage',url:url.href,name:title,description:input.description,inLanguage:'en-US',isPartOf:{'@id':origin+'/#website'},publisher:{'@id':origin+'/#organization'},primaryImageOfPage:{'@type':'ImageObject',contentUrl:absolute(input.image),caption:input.imageAlt},...(photo?{mainEntity:{'@id':url.href+'#converter'}}:{})};
 return{'@context':'https://schema.org','@graph':[{'@type':'Organization','@id':origin+'/#organization',name:'JotColoring',url:origin+'/',logo:absolute('/logo-3d.webp')},{'@type':'WebSite','@id':origin+'/#website',name:'JotColoring',alternateName:['Jot Coloring','jotcoloring.com'],url:origin+'/',inLanguage:'en-US',publisher:{'@id':origin+'/#organization'}},page,...(photo?[{'@type':'WebApplication','@id':url.href+'#converter',name:'JotColoring Photo to Coloring Page Converter',url:url.href,applicationCategory:'DesignApplication',operatingSystem:'Web browser',isAccessibleForFree:true,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},description:input.description,featureList:['Convert a photo into a coloring page','Adjust outline detail and line weight','Compare with the original photo','Download PDF, WEBP, PNG, JPG, SVG, or Word files','Process photos on your device']},{'@type':'FAQPage','@id':url.href+'#questions',mainEntity:PHOTO_FAQ.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))}]:[]),...(crumbs.length>1?[{'@type':'BreadcrumbList','@id':url.href+'#breadcrumbs',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.name,item:absolute(c.path)}))}]:[])]};
}

import {categoryById,categoryPath} from '../taxonomy/catalog';
export interface BreadcrumbContent {slug:string;title:string;category:string;categoryName:string;category_ids?:string[];subcategory?:string|null;tags?:string[]}
export interface ContentCrumb {name:string;path:string}
const numberWords=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
/** Navigation follows published memberships, never a filename or guessed category. */
export function contentBreadcrumbs(item:BreadcrumbContent):ContentCrumb[]{
 const root=categoryById(item.category);
 const crumbs:ContentCrumb[]=[{name:'Home',path:'/'},{name:root?.name||item.categoryName,path:categoryPath(item.category)}];
 const members=new Set(item.category_ids||[]);
 const child=[item.subcategory,...members].filter((id):id is string=>!!id).map(categoryById).find(c=>c?.parent===item.category&&members.has(c.id));
 if(child)crumbs.push({name:child.name,path:categoryPath(child.id)});
 // Numbers are subjects inside the Numbers collection; do not confuse scene
 // counts ("two cats") or recommended ages with the depicted numeral.
 if(child?.id==='numbers'){
  const explicit=item.title.match(/\b(?:number|numeral|digit)\s+(\d[\d,]*|[a-z]+)\b/i)?.[1]?.toLowerCase();
  const normalized=explicit&&/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(explicit)?explicit.replaceAll(',',''):explicit;
  const tagged=(item.tags||[]).find(t=>numberWords.includes(t.toLowerCase())||/^\d{1,6}$/.test(t));
  const token=normalized||tagged?.toLowerCase();
  const number=token&&/^\d{1,6}$/.test(token)?Number(token):numberWords.indexOf(token||'');
  if(number>=0&&number<=999999){const url=new URL(categoryPath('numbers'),'https://jotcoloring.com');url.searchParams.set('q',`number ${number}`);url.hash='catalog-results';crumbs.push({name:`Number ${number}`,path:url.pathname+url.search+url.hash});}
 }
 crumbs.push({name:item.title,path:`/coloring/${item.slug}/`});
 return crumbs;
}

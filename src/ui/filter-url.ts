import {isPublicCollection,collectionPath,publicCategoryPath,catalogAllPath} from '../taxonomy/routes';
type Filter='category'|'age'|'recommended_age'|'difficulty'|'sort';
export function selectFilterURL(current:string,name:Filter,values:string[]):URL {
 const url=new URL(current);url.searchParams.delete('page');url.searchParams.delete('cursor');
 const ageCollection=url.pathname.match(/^\/coloring-by-age\/(3-5|6-8|9-12|13-17|adults)\/$/);
 if(ageCollection&&name==='recommended_age'){
  const band=values[0]||'';
  if(band&&!/^(3-5|6-8|9-12|13-17|adults)$/.test(band))throw new Error('Invalid recommended age.');
  url.pathname=band?`/coloring-by-age/${band}/`:url.searchParams.get('subcategory')?publicCategoryPath(url.searchParams.get('subcategory')!):url.searchParams.get('collection')?collectionPath(url.searchParams.get('collection')!):url.searchParams.get('category')?publicCategoryPath(url.searchParams.get('category')!):'/coloring-pages/';url.searchParams.delete('recommended_age');
  if(!band)for(const key of ['category','subcategory','collection','number'])url.searchParams.delete(key);
  url.hash=band?'age-results':'catalog-results';return url;
 }
 if(name==='category'){
  const selection=values[0]||'',parts=selection.split('/'),category=parts.at(-1)||'',parent=parts.length===2?parts[0]:undefined;
  // A subject's parent may itself be a subject (for example cars/chrysler).
  if(selection&&!/^[a-z0-9-]+(?:\/[a-z0-9-]+)?$/.test(selection))throw new Error('Invalid category.');
  if(ageCollection){
   for(const key of ['category','subcategory','collection','number'])url.searchParams.delete(key);
   if(category){if(!parent&&isPublicCollection(category))url.searchParams.set('collection',category);else{url.searchParams.set('category',parent||category);if(parent)url.searchParams.set('subcategory',category);}}
   url.hash='age-results';return url;
  }
  const gallery=/\/all\/$/.test(url.pathname)||url.searchParams.get('view')==='pages',target=category?(isPublicCollection(category)?collectionPath(category):publicCategoryPath(category)):'/coloring-pages/';
  url.pathname=gallery?catalogAllPath(target):target;url.searchParams.delete('collection');url.searchParams.delete('number');url.searchParams.delete('view');
  url.searchParams.delete('category');url.searchParams.delete('subcategory');
 }else{url.searchParams.delete(name);for(const value of [...new Set(values)].filter(Boolean))url.searchParams.append(name,value);}
 url.hash=ageCollection&&name!=='category'?'age-results':'catalog-results';return url;
}
export function clearFilterURL(current:string):URL {
 const url=new URL(current);for(const key of ['age','recommended_age','difficulty','sort','page','cursor'])url.searchParams.delete(key);
 url.hash='catalog-results';return url;
}

/** One GET-form contract for native submits, search and immediate facet changes. */
export function catalogFilterFormURL(current:string,fields:URLSearchParams):URL {
 let target=new URL(current);
 if(!/^\/(?:coloring-pages|collections|collection)(?:\/[a-z0-9-]+)*\/$/.test(target.pathname)&&!/^\/coloring-by-age\/(?:3-5|6-8|9-12|13-17|adults)\/$/.test(target.pathname))throw new Error('Invalid catalog source.');
 const category=fields.get('category')||'',initial=fields.get('initial_category')||'';
 if(category!==initial)target=selectFilterURL(target.href,'category',[category]);
 for(const name of ['recommended_age','difficulty','sort'] as const)target=selectFilterURL(target.href,name,[fields.get(name)||'']);
 const search=(fields.get('q')||'').normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,160);
 target.searchParams.delete('q');if(search)target.searchParams.set('q',search);
 target.searchParams.delete('page');target.searchParams.delete('cursor');
 target.hash=target.pathname.startsWith('/coloring-by-age/')?'age-results':'catalog-results';
 return target;
}

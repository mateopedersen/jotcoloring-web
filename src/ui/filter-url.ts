import {isPublicCollection,collectionPath,publicCategoryPath} from '../taxonomy/routes';
type Filter='category'|'age'|'recommended_age'|'difficulty'|'sort';
export function selectFilterURL(current:string,name:Filter,values:string[]):URL {
 const url=new URL(current);url.searchParams.delete('page');url.searchParams.delete('cursor');
 const ageCollection=url.pathname.match(/^\/coloring-by-age\/(3-5|6-8|9-12|13-17|adults)\/$/);
 if(ageCollection&&name==='recommended_age'){
  const band=values[0]||'';
  if(band&&!/^(3-5|6-8|9-12|13-17|adults)$/.test(band))throw new Error('Invalid recommended age.');
  url.pathname=band?`/coloring-by-age/${band}/`:'/coloring-pages/';url.searchParams.delete('recommended_age');
  url.hash=band?'age-results':'catalog-results';return url;
 }
 if(name==='category'){
  if(ageCollection)url.searchParams.set('recommended_age',ageCollection[1]);
  const category=values[0]||'';
  if(category&&!/^[a-z0-9-]+$/.test(category))throw new Error('Invalid category.');
  url.pathname=category?(isPublicCollection(category)?collectionPath(category):publicCategoryPath(category)):'/coloring-pages/';url.searchParams.delete('collection');url.searchParams.delete('number');
  url.searchParams.delete('category');url.searchParams.delete('subcategory');
 }else{url.searchParams.delete(name);for(const value of [...new Set(values)].filter(Boolean))url.searchParams.append(name,value);}
 url.hash=ageCollection&&name!=='category'?'age-results':'catalog-results';return url;
}
export function clearFilterURL(current:string):URL {
 const url=new URL(current);for(const key of ['age','recommended_age','difficulty','sort','page','cursor'])url.searchParams.delete(key);
 url.hash='catalog-results';return url;
}

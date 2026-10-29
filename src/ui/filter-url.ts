type Filter='category'|'age'|'recommended_age'|'difficulty'|'sort';
export function selectFilterURL(current:string,name:Filter,values:string[]):URL {
 const url=new URL(current);url.searchParams.delete('page');url.searchParams.delete('cursor');
 if(name==='category'){
  const category=values[0]||'';
  if(category&&!/^[a-z0-9-]+$/.test(category))throw new Error('Invalid category.');
  url.pathname=category?`/coloring-pages/${category}/`:'/coloring-pages/';
  url.searchParams.delete('category');url.searchParams.delete('subcategory');
 }else{url.searchParams.delete(name);for(const value of [...new Set(values)].filter(Boolean))url.searchParams.append(name,value);}
 url.hash='catalog-results';return url;
}
export function clearFilterURL(current:string):URL {
 const url=new URL(current);for(const key of ['age','recommended_age','difficulty','sort','page','cursor'])url.searchParams.delete(key);
 url.hash='catalog-results';return url;
}

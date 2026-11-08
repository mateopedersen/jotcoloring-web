import {createCatalog,parseCatalogQuery,type CatalogRepository} from './catalog';
import {AppError} from './http';
import {loadSeriesDirectory} from './series-directory';
import type {CatalogPage,CatalogQuery,Env} from './types';
import type {CatalogLocation} from '../taxonomy/catalog-location';
import {catalogParameters} from '../taxonomy/catalog-query';

/** Resolve required reads in the page frontmatter, before Astro commits streamed headers. */
export async function loadCatalogView(env:Env,location:CatalogLocation,url:URL,repo:CatalogRepository=createCatalog(env)){
 const {collection,topic,number}=location;
 const category=collection?.roots[0]||topic?.parent||topic?.id||(number?'education':'');
 const subcategory=topic?.parent?topic.id:number?'numbers':'';
 const filtered=[...url.searchParams.keys()].some(key=>key!=='page');
 let query:CatalogQuery={age:[],difficulty:[],sort:'trending'};
 let result:CatalogPage={items:[],total:0,page:1,page_size:12,total_pages:0,next_cursor:null,has_more:false};
 let categoryCounts:Awaited<ReturnType<CatalogRepository['categories']>>=[];
 let series:Awaited<ReturnType<typeof loadSeriesDirectory>>=[];
 let cover:Awaited<ReturnType<CatalogRepository['categoryCover']>>=null;
 let relatedCollections:Awaited<ReturnType<CatalogRepository['relatedCollections']>>|undefined;
 let directoryMode=false,error='',status=200;
 const finish=()=>{
  const headers:Record<string,string>={};
  if(status>=400)headers['Cache-Control']='no-store';
  if(status===503)headers['Retry-After']='2';
  return {collection,topic,number,category,subcategory,filtered,query,result,categoryCounts,series,cover,relatedCollections,directoryMode,error,status,headers};
 };
 try{query=parseCatalogQuery(catalogParameters(location,url.searchParams));}
 catch(e){status=e instanceof AppError&&e.status<500?e.status:503;error=e instanceof AppError&&e.status<500?e.message:'These coloring pages are temporarily busy. Please try again in a moment.';return finish();}
 categoryCounts=await repo.categories().catch(()=>[]);
 if(!filtered&&!location.allPages)try{series=await loadSeriesDirectory(env,repo,location,categoryCounts);}
 catch(e){console.error('Collection directory unavailable',e instanceof Error?e.message:'unknown');}
 directoryMode=series.length>0;
 const independentCover=directoryMode?Promise.resolve(series.find(entry=>entry.cover)?.cover||null):number?Promise.resolve(null):
  (collection?repo.categoryCovers(collection.roots).then(c=>c.find(Boolean)||null):repo.categoryCover(subcategory||category||undefined)).catch(()=>null);
 try{if(!directoryMode)result=await repo.list(query);}
 catch(e){const invalid=e instanceof AppError&&e.status<500;status=invalid?e.status:503;error=invalid?e.message:'These coloring pages are temporarily busy. Please try again in a moment.';if(!invalid)console.error('Catalog request failed',e);}
 cover=number?result.items[0]||null:await independentCover;
 if(!error&&number&&!result.total&&!filtered)status=404;
 if(!directoryMode&&!error&&!number)try{relatedCollections=await repo.relatedCollections(query,result);}
 catch(e){console.error('Optional collection recommendations unavailable',e instanceof Error?e.message:'unknown');}
 return finish();
}
export type CatalogViewData=Awaited<ReturnType<typeof loadCatalogView>>;

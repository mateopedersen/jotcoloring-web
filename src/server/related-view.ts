import {rankRelated,type RelatedResult} from '../content/related';
import type {Content} from './types';
import type {CatalogRepository} from './catalog';

/** Recommendations are secondary. A temporary provider failure must not turn
 * a healthy original drawing and its downloads into an uncaught 500 page. */
export async function loadRelatedView(repo:Pick<CatalogRepository,'related'>,item:Content):Promise<RelatedResult>{
 try{return await repo.related(item);}
 catch(error){
  console.error('Optional drawing recommendations unavailable',error instanceof Error?error.message:'unknown');
  return {...rankRelated(item,[]),unavailable:true};
 }
}

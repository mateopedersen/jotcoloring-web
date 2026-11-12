import {catalogReviewSeed,scopedCatalogReviewFilter} from '../age/difficulty';
import type {CatalogQuery} from './types';
/** Category-independent eligibility reused by bounded samples and exact scoped counts. */
export function collectionScope(query:CatalogQuery){const where=["c.status='published'",'c.active_version IS NOT NULL','c.example_only=0'],values:unknown[]=[];
 if(query.recommended_age||query.difficulty?.length){where.push(scopedCatalogReviewFilter(query.difficulty||[],!!query.recommended_age));if(query.recommended_age)values.push(query.recommended_age);}
 if(query.age?.length){where.push(`EXISTS(SELECT 1 FROM content_age ca WHERE ca.content_id=c.id AND ca.age IN (${query.age.map(()=>'?').join(',')}))`);values.push(...query.age);}
 return{sql:where.join(' AND '),values};
}

/** Resolve the current source-bound candidate set once for exact destination
 * counts. Rebuilding a global detail subquery for every related root can exhaust
 * D1's resource window, even though the visible gallery itself is inexpensive. */
export function collectionCountCandidates(query:CatalogQuery){
 const seed=query.recommended_age||query.difficulty?.length?catalogReviewSeed(query.difficulty||[],!!query.recommended_age):undefined;
 if(!seed)return {source:'content c',...collectionScope(query)};
 const base=collectionScope({...query,recommended_age:undefined,difficulty:[]});
 return {source:seed.source,sql:base.sql+' AND '+seed.sql,values:[...base.values,...(query.recommended_age?[query.recommended_age]:[])]};
}

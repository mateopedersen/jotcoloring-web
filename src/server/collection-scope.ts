import type {CatalogQuery} from './types';
/** Category-independent eligibility reused by bounded samples and exact scoped counts. */
export function collectionScope(query:CatalogQuery){const where=["c.status='published'",'c.active_version IS NOT NULL','c.example_only=0'],values:unknown[]=[];
 if(query.recommended_age){where.push("EXISTS(SELECT 1 FROM age_recommendation ar JOIN asset a ON a.content_id=ar.content_id AND a.content_version=ar.content_version AND a.role='printable_webp_bw' AND a.sha256=ar.source_sha256 WHERE ar.content_id=c.id AND ar.content_version=c.active_version AND ar.band=?)");values.push(query.recommended_age);}
 if(query.age?.length){where.push(`EXISTS(SELECT 1 FROM content_age ca WHERE ca.content_id=c.id AND ca.age IN (${query.age.map(()=>'?').join(',')}))`);values.push(...query.age);}
 if(query.difficulty?.length){where.push(`c.difficulty IN (${query.difficulty.map(()=>'?').join(',')})`);values.push(...query.difficulty);}
 return{sql:where.join(' AND '),values};
}

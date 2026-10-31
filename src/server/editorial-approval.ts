import {canonicalJSON,sha256} from './http';
/** A copy or source replacement invalidates both editorial passes. */
export async function requireDoubleEditorialApproval(review:any,sourceSHA256:string){
 const a=review.second_editorial_review;
 if(!a||a.passes!==2||a.design_id!==review.design_id||a.source_sha256!==sourceSHA256)throw Error('Two source-bound editorial passes required');
 const metadata=Object.fromEntries(['title','description','alt_text','category_ids'].map(k=>[k,review[k]]));
 if(await sha256(canonicalJSON(metadata))!==a.metadata_sha256)throw Error('Second editorial approval is stale');
}

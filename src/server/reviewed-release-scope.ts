/** Explicit owner-authorized release scopes; the completed 24-topic gate remains strict. */
export const FOLLOWUP_RELEASE_ID='descendants-squishy-kpop-20261101';
export function reviewedReleaseScope(id?:unknown){
 if(id===undefined)return {collections:24,designs:2400,topics:null as readonly string[]|null};
 if(id===FOLLOWUP_RELEASE_ID)return {collections:3,designs:300,topics:['descendants-coloring-pages','squishy-coloring-pages','k-pop-demon-hunters-coloring-pages'] as readonly string[]};
 throw Error('Unknown owner-authorized release scope');
}
export function matchesReviewedReleaseScope(release:{id?:unknown;collections?:unknown;designs?:unknown}){
 try{const scope=reviewedReleaseScope(release.id);return release.collections===scope.collections&&release.designs===scope.designs;}catch{return false;}
}

/** Explicit owner-authorized release scopes; completed release gates remain strict. */
export const FOLLOWUP_RELEASE_ID='descendants-squishy-kpop-20261101';
export const SEVEN_TOPIC_RELEASE_ID='seven-topics-20261101';
export const SEVEN_TOPIC_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
 'turtle-coloring-pages':'b97029c20445fc599163d49de0bbfbd46c20e1275380a9a456e9101a32944840',
 'sharks-coloring-pages':'37b790536c965a8cfc600ddc31cea256ac6c09d3ab4da36b79a4f4f2c740783d',
 'trick-or-treat-coloring-pages':'5db488e43238cdcea6f6d34151d5ddfc1ae2ca1fda6e5f7934d15909c20c1ee6',
 'bible-coloring-pages':'96bd9ff7ec0beb093aa40d37d2492d7391f7f07a10de15b5abac3b6079f6bbb8',
 'fnaf-coloring-pages':'92b459e032d483c41a52d9ba49794472b13a476d9e99bde5369dc83c7756e65c',
 'happy-birthday-coloring-pages':'6b2b1865c9ad17e6c928945d685eabe54c922e68abbe93a82e0798b256823501',
 'panda-coloring-pages':'4b5db2b042ae4444f25148c359ce11fd6f20f1844af9be9f8fc13cc5a6a52344'
};
export function reviewedReleaseScope(id?:unknown){
 if(id===undefined)return {collections:24,designs:2400,topics:null as readonly string[]|null};
 if(id===FOLLOWUP_RELEASE_ID)return {collections:3,designs:300,topics:['descendants-coloring-pages','squishy-coloring-pages','k-pop-demon-hunters-coloring-pages'] as readonly string[]};
 if(id===SEVEN_TOPIC_RELEASE_ID)return {collections:7,designs:700,topics:Object.keys(SEVEN_TOPIC_ZIP_CHECKSUMS) as readonly string[]};
 throw Error('Unknown owner-authorized release scope');
}
export function matchesReviewedReleaseScope(release:{id?:unknown;collections?:unknown;designs?:unknown}){
 try{const scope=reviewedReleaseScope(release.id);return release.collections===scope.collections&&release.designs===scope.designs;}catch{return false;}
}
export function matchesReviewedSourceArchives(release:{release_id?:unknown;source_zip_sha256?:unknown;source_zip_sha256s?:unknown}){
 if(release.release_id===undefined)return true;
 if(release.release_id===FOLLOWUP_RELEASE_ID)return release.source_zip_sha256==='d45545c97ec95111b93c311321c0c886482cc59e2a1d68d5262bf983b9060896';
 if(release.release_id!==SEVEN_TOPIC_RELEASE_ID||!release.source_zip_sha256s||typeof release.source_zip_sha256s!=='object')return false;
 const actual=release.source_zip_sha256s as Record<string,unknown>,expected=SEVEN_TOPIC_ZIP_CHECKSUMS;
 return Object.keys(actual).length===Object.keys(expected).length&&Object.entries(expected).every(([topic,hash])=>actual[topic]===hash);
}

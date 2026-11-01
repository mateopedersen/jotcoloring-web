import showcase from '../content/home-showcase.json';
import reviewed from '../content/color-references.json';

export interface ReviewedColorReference {id:string;sourceHash:string;referenceHash:string;url?:string;previewHash?:string}
export function assetHash(url:string|null|undefined):string|undefined{
 if(!url)return;
 try{const u=new URL(url,'https://jotcoloring.com');return u.pathname.match(/[.-]([a-f0-9]{24,64})\.(?:webp|png)$/)?.[1]||u.searchParams.get('v')?.match(/^[a-f0-9]{24,64}$/)?.[0];}catch{return;}
}
export function resolveReviewedReference(item:{id:string;lineArtUrl:string;preview?:string;color_reference?:string|null;home_color?:string|null},entries:readonly ReviewedColorReference[]=reviewed):string|undefined{
 const source=assetHash(item.lineArtUrl);if(!source)return;
 const match=entries.find(r=>r.id===item.id&&r.sourceHash.slice(0,24)===source.slice(0,24));
 if(match){
  if(match.previewHash&&assetHash(item.preview)?.slice(0,24)!==match.previewHash.slice(0,24))return;
  const reference=match.url||item.color_reference;
  if(reference&&assetHash(reference)?.slice(0,24)===match.referenceHash.slice(0,24))return reference;
 }
 // The original homepage pins carry an explicit reviewed source/color pair.
 // Never substitute a newer, unreviewed automatic fill for that pinned pair.
 const pinned=showcase.find(r=>r.id===item.id&&r.sourceHash===source.slice(0,24));
 return pinned?.home_color;
}

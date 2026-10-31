/** Reserve the first four gallery places for recent published color-ready pages.
 * Older favorites fill the remaining places. No duplicate or fixed placeholder.
 */
export function homeGallerySelection<T extends {id:string}>(featured:T[],latest:T[],limit=24):T[]{
 const seen=new Set<string>(),items:T[]=[];
 for(const item of [...latest.slice(0,4),...featured]){if(seen.has(item.id))continue;seen.add(item.id);items.push(item);if(items.length>=limit)break;}
 return items;
}

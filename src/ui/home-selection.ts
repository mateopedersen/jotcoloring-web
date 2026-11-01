import showcase from '../content/home-showcase.json';
import type {Content} from '../server/types';
export const HOME_SHOWCASE_KEYS=showcase.map(item=>item.id);
export const HOME_SHOWCASE_TABS=[
 {id:'trending',label:'Featured pages',hint:'Our colorful favorites'},
 {id:'newest',label:'Animals & nature',hint:'Wings, leaves & wild things'},
 {id:'easy',label:'Sweet & cozy',hint:'Little moments to color'},
 {id:'detailed',label:'Dream & explore',hint:'A world of imagination'}
];
/** The homepage is a reviewed showcase, independent of publication order.
 * An image replacement leaves the showcase until its new source is reviewed.
 */
export function homeGallerySelection(items:(Content|null)[],tab='trending'):Content[]{
 const byId=new Map(items.filter((item):item is Content=>!!item).map(item=>[item.id,item]));
 return showcase.flatMap(pinned=>{
  const item=byId.get(pinned.id);if(!item||!item.lineArtUrl.includes(pinned.sourceHash))return [];
  if(tab==='newest'&&!['animals','flowers','nature','ocean'].includes(item.category))return [];
  if(tab==='easy'&&!['jc-sweet-treats','jc-cozy-bookshop','jc-sleepy-kitten','jc-playful-puppy','jc-winter-wishes','jc-farm-friends','jc-little-hedgehog'].includes(item.id))return [];
  if(tab==='detailed'&&!['fantasy','space','vehicles','dinosaurs','mandalas'].includes(item.category))return [];
  return [{...item,thumbnail:pinned.thumbnail,thumbnailSrcset:pinned.thumbnailSrcset,home_color:pinned.home_color,homeColorSrcset:pinned.homeColorSrcset}];
 });
}

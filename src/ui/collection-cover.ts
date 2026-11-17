import showcase from '../content/home-showcase.json';
import type {CollectionArtwork} from '../server/types';

/** Curated color art is usable only while its original source binding matches. */
export function collectionCover(cover?:CollectionArtwork){
 if(!cover)return;
 const pin=showcase.find(p=>p.id===cover.id&&cover.lineArtUrl.includes(p.sourceHash));
 return {src:pin?.home_color||cover.thumbnail,srcset:pin?.homeColorSrcset||cover.thumbnailSrcset,width:cover.width||400,height:cover.height||600,alt:cover.alt};
}

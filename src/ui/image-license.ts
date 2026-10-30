import {artworkText} from './artwork-text';
import type {Content} from '../server/types';

export const LICENSING_CONTACT='jotcoloring@gmail.com';
export function imageLicenseSchema(item:Content,origin:string,asset=item.lineArtUrl){
 const text=artworkText(item);
 const absolute=(path:string)=>new URL(path,origin).href;
 return {'@context':'https://schema.org','@type':'ImageObject',
  '@id':absolute(asset)+'#jotcoloring-image',name:text.title,description:text.description,caption:text.description,
  contentUrl:absolute(asset),thumbnailUrl:absolute(item.thumbnail),url:absolute(`/coloring/${item.slug}/`),
  encodingFormat:'image/webp',...(asset===item.lineArtUrl?{width:item.width,height:item.height}:{}),
  license:absolute('/license/'),acquireLicensePage:absolute(`/licensing/?image=${encodeURIComponent(item.slug)}`),
  creditText:'JotColoring',creator:{'@type':'Organization',name:'JotColoring',url:absolute('/')},
  copyrightNotice:'JotColoring. Personal and educational use permitted; commercial use requires written permission.'};
}

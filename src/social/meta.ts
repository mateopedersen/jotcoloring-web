import generated from './generated.json';
import {socialPageKey,OG_WIDTH,OG_HEIGHT} from './model';
import type {Content} from '../server/types';
const cards=generated as Record<string,{src:string;alt:string;title:string;description:string}>;
export function socialOrigin(actual:string,configured?:string,environment?:string){const url=new URL(actual);return environment==='local'||['localhost','127.0.0.1','[::1]'].includes(url.hostname)?url.origin:new URL(configured||actual).origin;}
export function socialMetadata(path:string,status:number,origin:string,item?:Pick<Content,'slug'|'title'|'description'|'category'|'social_image'>,mediaBase?:string){const key=item?'category-'+item.category:socialPageKey(path,status),card=cards[key]||cards.home;const source=item?.social_image||card.src;return{image:new URL(source,mediaBase||origin).href,alt:item?.social_image?`JotColoring coloring page: ${item.title}. ${item.description}`.slice(0,410):card.alt,width:OG_WIDTH,height:OG_HEIGHT,mime:'image/png',title:item?`${item.title} coloring page — JotColoring`:card.title+' — JotColoring',description:item?.description||card.description};}

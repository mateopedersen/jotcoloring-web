import type {Content} from '../server/types';
import {artworkText} from '../ui/artwork-text';
import {safeMediaURL} from '../downloads/model';
import type {SharePlatform} from './platforms';
export interface ShareArtwork {id:string;slug:string;title:string;description:string;alt:string;url:string;image:string;source:string;width:number;height:number}
const PUBLIC_ORIGIN='https://jotcoloring.com';
export function shareArtwork(item:Content):ShareArtwork{
 if(!item||!/^[A-Za-z0-9_-]{1,160}$/.test(item.id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug)||!Number.isInteger(item.width)||!Number.isInteger(item.height)||item.width<1||item.height<1||item.width*item.height>40000000)throw new Error('This coloring page is unavailable for sharing.');
 const text=artworkText(item);if(!text.title.trim())throw new Error('The coloring page has no title.');
 return{id:item.id,slug:item.slug,...text,url:`${PUBLIC_ORIGIN}/coloring/${item.slug}/`,image:new URL(safeMediaURL(item.preview||item.thumbnail),PUBLIC_ORIGIN).href,source:safeMediaURL(item.lineArtUrl||item.preview),width:item.width,height:item.height};
}
export function defaultCaption(item:ShareArtwork){return `A little inspiration for your next coloring break: ${item.title} on JotColoring.`;}
export function captionWithLink(caption:string,url:string){const text=caption.trim();return text.includes(url)?text:[text,url].filter(Boolean).join('\n\n');}
function intentURL(base:string,params:Record<string,string>){const url=new URL(base);for(const[k,v]of Object.entries(params))url.searchParams.set(k,v);return url.href;}
/** A composer only prepares a draft; the person always confirms in that service. */
export function shareDestination(platform:SharePlatform,item:ShareArtwork,caption:string){
 const message=captionWithLink(caption,item.url);
 const limited=(length:number)=>captionWithLink([...caption].slice(0,Math.max(0,length-2-[...item.url].length)).join(''),item.url);
 switch(platform.intent){
  case 'pinterest':return intentURL('https://www.pinterest.com/pin/create/button/',{url:item.url,media:item.image,description:caption.slice(0,500)});
  case 'facebook':return intentURL('https://www.facebook.com/sharer/sharer.php',{u:item.url});
  case 'whatsapp':return intentURL('https://wa.me/',{text:message});
  case 'x':return intentURL('https://x.com/intent/tweet',{text:caption.slice(0,240),url:item.url});
  case 'telegram':return intentURL('https://t.me/share/url',{url:item.url,text:caption});
  case 'linkedin':return intentURL('https://www.linkedin.com/sharing/share-offsite/',{url:item.url});
  case 'reddit':return intentURL('https://www.reddit.com/submit',{url:item.url,title:item.title+' coloring page'});
  case 'bluesky':return intentURL('https://bsky.app/intent/compose',{text:limited(300)});
  case 'threads':return intentURL('https://www.threads.com/intent/post',{text:limited(500)});
  case 'tumblr':return intentURL('https://www.tumblr.com/widgets/share/tool',{canonicalUrl:item.url,posttype:'link',title:item.title,caption:caption.replace(/[<>]/g,'')});
  default:return platform.home;
 }
}
export function platformInstructions(platform:SharePlatform){return platform.note|| (platform.intent==='facebook'||platform.intent==='linkedin'?'The page link opens in a sharing draft. Copy your caption if you want to add it; this platform may not prefill your words.':platform.intent==='reddit'?'Choose a community in Reddit and review its rules before submitting. Your page title and link are prepared.':platform.intent?'Review the draft in the app before you post. The app decides whether a link preview or image is attached.':platform.group==='Creative'?'Save the PNG or share your own colored version where community rules allow. Paste your caption and credit the original JotColoring page.':'Copy your caption and link, then paste them into a post or conversation in the app. Attach the saved PNG where supported.');}
export function shareImageDimensions(width:number,height:number){if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width*height>40000000)throw new Error('This image size is not supported.');const scale=Math.min(1,2000/Math.max(width,height),Math.sqrt(3000000/(width*height)));return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};}

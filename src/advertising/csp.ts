import {isApprovedAdvertisingOrigin,permitsAdvertising} from './model';
import {ADVERTISING_PROVIDER_ORIGIN} from './units';
import {ADVERTISING_DELIVERY_ENABLED} from './config';

// No route alone grants an exception: only a real public HTML response with one
// shared-layout slot does. The client still requires age and advertising choices.
async function advertisingHTML(request:Request,response:Response,deliveryEnabled:boolean,previewPlacement=false){
 const url=new URL(request.url);
 const localPreview=previewPlacement&&['127.0.0.1','localhost'].includes(url.hostname);
 if(request.method!=='GET'||(!isApprovedAdvertisingOrigin(url.origin)&&!localPreview)||!permitsAdvertising(url.pathname,url.search,url.hash,deliveryEnabled)||response.status!==200||/\battachment\b/i.test(response.headers.get('content-disposition')||'')||!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')||''))return;
 const html=await response.clone().text();
 const canonical=html.match(/<link\b(?=[^>]*\brel=["']canonical["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i)?.[1];
 if(!canonical)return;
 let canonicalURL:URL;try{canonicalURL=new URL(canonical,url);}catch{return;}
 if(localPreview?canonicalURL.pathname!==url.pathname:canonicalURL.href!==url.href)return;
 if([...html.matchAll(/<aside\b[^>]*\bdata-advertising-slot(?:\s|=|>)/gi)].length!==1)return;
 return html;
}
export async function hasAdvertisingResponse(request:Request,response:Response,deliveryEnabled:boolean=ADVERTISING_DELIVERY_ENABLED){return typeof await advertisingHTML(request,response,deliveryEnabled)==='string';}
/** Position the one shared slot on the server, so a late client move cannot shift content. */
export async function prepareAdvertisingResponse(request:Request,response:Response,deliveryEnabled:boolean=ADVERTISING_DELIVERY_ENABLED){
 const html=await advertisingHTML(request,response,deliveryEnabled,true);
 if(!html)return{response,available:false};
 const marker=/<template data-jc-public-ad="start"><\/template>([\s\S]*?)<template data-jc-public-ad="end"><\/template>/;
 const block=html.match(marker)?.[0];
 if(!block)return{response,available:false};
 const without=html.replace(marker,'');
 const main=/<main\b[^>]*>/i;
 const header=/<header\b[^>]*>[\s\S]*?<\/header>/i;
 if(!main.test(without))return{response,available:false};
 const placed=header.test(without)?without.replace(header,match=>match+block):without.replace(main,match=>block+match);
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('etag');
 return{response:new Response(placed,{status:response.status,statusText:response.statusText,headers}),available:isApprovedAdvertisingOrigin(new URL(request.url).origin)};
}
export function jotContentSecurityPolicy(url:URL,deliveryEnabled:boolean=ADVERTISING_DELIVERY_ENABLED,responseHasSlot=false){
 const eligible=responseHasSlot&&isApprovedAdvertisingOrigin(url.origin)&&permitsAdvertising(url.pathname,url.search,url.hash,deliveryEnabled);
 const ad=eligible?` ${ADVERTISING_PROVIDER_ORIGIN}`:'';
 const adImages=eligible?' https://static.nresystems.com https://cdn.storageimagedisplay.com':'';
 // The unmodified provider tag creates an about:blank frame with a rotating
 // inline creative. Its per-impression body cannot be pinned with a CSP hash.
 // Allow that mechanism only here; HTML event attributes remain blocked.
 const adInline=eligible?" 'unsafe-inline'":'';
 return `default-src 'self'; img-src 'self' data: blob: https://media.jotcoloring.com https://assets.jotcoloring.com${ad}${adImages}; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'${ad}${adInline}; script-src-attr 'none'; worker-src 'self' blob:; connect-src 'self' https://media.jotcoloring.com https://assets.jotcoloring.com ws://127.0.0.1:*${ad}; frame-src ${ad?"'self' ":''}https://docs.google.com${ad}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'${eligible?"; object-src 'none'":''}`;
}

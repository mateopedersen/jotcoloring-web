/** A missing display copy falls back to the declared original before retrying a
 * stale same-origin rendition. Never redirect an image to an unrelated host. */
export function retryCurrentMedia(image:HTMLImageElement,pageURL=location.href){
 if(image.dataset.mediaRetried)return;
 const source=image.getAttribute('src');if(!source)return;
 if(image.srcset&&!image.dataset.responsiveRetried){
  image.dataset.responsiveRetried='true';image.removeAttribute('srcset');image.removeAttribute('sizes');image.src=source;return;
 }
 let url:URL;try{url=new URL(source,pageURL);}catch{return;}
 if(url.origin!==new URL(pageURL).origin||!url.pathname.startsWith('/api/media/')||!url.searchParams.has('v'))return;
 image.dataset.mediaRetried='true';url.searchParams.delete('v');url.searchParams.delete('display');url.searchParams.set('refresh',String(Date.now()));image.src=url.pathname+url.search;
}

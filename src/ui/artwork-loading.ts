/** Keep display requests on the existing reviewed R2 renditions. These sizes are
 * shared by the image and its preload so browsers do not fetch two candidates. */
export const GALLERY_IMAGE_SIZES='(max-width:600px) 40vw, (max-width:850px) 44vw, 280px';
export const DETAIL_IMAGE_SIZES='(min-width:1536px) 680px, (min-width:851px) calc((100vw - 160px) / 2), calc(100vw - 60px)';
export const DOWNLOAD_IMAGE_SIZES='(max-width:650px) calc(100vw - 64px), (max-width:1000px) 44vw, 480px';
export const COLLECTION_COVER_SIZES='(max-width:600px) 24vw, 200px';
export const FIRST_ROW_IMAGES=4;

export function artworkLoading({eager=false,priority=false,sizes=GALLERY_IMAGE_SIZES,srcset}:{eager?:boolean;priority?:boolean;sizes?:string;srcset?:string}={}){
 const loading=eager||priority?'eager':'lazy';
 // `auto` is valid only with lazy loading. Older Safari uses the explicit sizes.
 const fallback=sizes.replace(/^auto\s*,\s*/,'');
 return {loading,decoding:'async',fetchpriority:priority?'high':'auto',sizes:srcset?(loading==='lazy'?`auto, ${fallback}`:fallback):undefined} as const;
}

export function mediaConnectionOrigin(base:unknown){
 if(typeof base!=='string')return;
 try{const url=new URL(base);if(url.protocol==='https:'&&!url.username&&!url.password&&['assets.jotcoloring.com','media.jotcoloring.com'].includes(url.hostname))return url.origin;}catch{}
}

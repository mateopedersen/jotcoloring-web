/** Browser canvas primitives without studio tools or object catalogs. */
export function makeCanvas(width:number,height:number){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
export async function loadSource(blob:Blob):Promise<HTMLImageElement>{const url=URL.createObjectURL(blob);try{const img=new Image();img.decoding='async';img.src=url;await img.decode();return img;}finally{URL.revokeObjectURL(url);}}
export function canvasBlob(canvas:HTMLCanvasElement,type:string,quality?:number):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(blob=>{if(!blob||!blob.size)reject(new Error('The image encoder returned an empty file.'));else if(blob.type!==type)reject(new Error(`This browser cannot export ${type.replace('image/','').toUpperCase()}. Use another browser; no file was downloaded.`));else resolve(blob);},type,quality));}
/** Internal previews may use PNG when a browser lacks a WEBP encoder. Actual exports stay strict. */
export async function canvasPreviewBlob(canvas:HTMLCanvasElement,quality=.8):Promise<Blob>{
  try{return await canvasBlob(canvas,'image/webp',quality);}catch{return canvasBlob(canvas,'image/png');}
}

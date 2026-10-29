import {PhotonImage,initPhoton} from '@cf-wasm/photon/others';
/** Lossless codec, loaded only for Image downloads. Photo pixels never leave the device. */
export async function losslessWebP(canvas:HTMLCanvasElement){
 if(!initPhoton.ready){if(initPhoton.initialized)await initPhoton.ensure();else await initPhoton({module_or_path:fetch('/codecs/photon-0.4.0.wasm')});}
 const raw=canvas.getContext('2d')!.getImageData(0,0,canvas.width,canvas.height).data,image=new PhotonImage(new Uint8Array(raw),canvas.width,canvas.height);
 try{const bytes=image.get_bytes_webp();return new Blob([bytes as BlobPart],{type:'image/webp'});}finally{image.free();}
}

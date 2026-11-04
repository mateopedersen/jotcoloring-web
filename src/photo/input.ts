import {rasterHeader} from '../ui/raster-header';
import {MAX_PHOTO_BYTES,MAX_PHOTO_PIXELS} from './outline';
/** Inspect static raster headers before asking the browser to decode pixels. */
export function photoHeader(b:Uint8Array){const header=rasterHeader(b);if(header.width<64||header.height<64||header.width*header.height>MAX_PHOTO_PIXELS)throw new Error('Choose a photo between 64 pixels and 32 megapixels.');return header;}
export async function validatePhotoFile(file:File){if(!file.size||file.size>MAX_PHOTO_BYTES)throw new Error('Choose a photo no larger than 20 MB.');const header=photoHeader(new Uint8Array(await file.slice(0,262144).arrayBuffer()));if(file.type&&file.type!==header.mime&&!(file.type==='image/jpg'&&header.mime==='image/jpeg'))throw new Error('The photo contents do not match its file type.');return header;}

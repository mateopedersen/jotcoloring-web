import { floodRegion } from './flood-fill';
self.onmessage=(event:MessageEvent)=>{const {id,mask,width,height,x,y,threshold,closeGaps,tapRadius}=event.data;try{const spans=floodRegion(new Uint8ClampedArray(mask),width,height,x,y,threshold,closeGaps,tapRadius||0);self.postMessage({id,spans});}catch(error){self.postMessage({id,error:error instanceof Error?error.message:'Fill failed'});}};

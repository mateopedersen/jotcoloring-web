/** Small bounded color quantization for lossless Worker WebP encoding.
 * Max channel error is half a step (4 or 8); near-black ink, white paper,
 * transparency and the complete approved brand band remain byte-exact.
 */
export function compactColorPixels(raw:Uint8Array,width:number,height:number,artBottom:number,step:8|16){
 if(raw.length!==width*height*4||!Number.isSafeInteger(artBottom)||artBottom<1||artBottom>height||![8,16].includes(step))throw new Error('Invalid color compression input.');
 const result=raw.slice();
 for(let p=0;p<width*artBottom*4;p+=4){if(raw[p+3]<240||Math.max(raw[p],raw[p+1],raw[p+2])<43)continue;for(let c=0;c<3;c++)result[p+c]=Math.min(255,Math.round(raw[p+c]/step)*step);}
 return result;
}

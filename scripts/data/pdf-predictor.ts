/** Decode bounded, eight-bit RGB PNG prediction in supplied PDF image streams. */
export function decodePDFPNGPrediction(input:Uint8Array,width:number,height:number,colors:number,predictor:number){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>25_000_000||colors!==3||predictor<10||predictor>15)throw Error('Unsupported PDF image prediction');
 const stride=width*colors;if(input.length!==height*(stride+1))throw Error('PDF predictor row length mismatch');
 const out=Buffer.alloc(height*stride);
 for(let y=0;y<height;y++){
  const filter=input[y*(stride+1)];if(filter>4||predictor!==15&&filter!==predictor-10)throw Error('Invalid PDF predictor filter');
  for(let x=0;x<stride;x++){
   const left=x>=colors?out[y*stride+x-colors]:0,up=y?out[(y-1)*stride+x]:0,upperLeft=y&&x>=colors?out[(y-1)*stride+x-colors]:0;
   let value=0;
   if(filter===1)value=left;
   else if(filter===2)value=up;
   else if(filter===3)value=Math.floor((left+up)/2);
   else if(filter===4){const p=left+up-upperLeft,a=Math.abs(p-left),b=Math.abs(p-up),c=Math.abs(p-upperLeft);value=a<=b&&a<=c?left:b<=c?up:upperLeft;}
   out[y*stride+x]=(input[y*(stride+1)+x+1]+value)&255;
  }
 }
 return out;
}

/** Inspect the source page without altering its artwork, thin frame or owner logo. */
export function inspectSuppliedPagePixels(data:Uint8Array,width:number,height:number,channels=3){
 if(channels<3||data.length!==width*height*channels)throw Error('Invalid decoded supplied page');
 const left=width*.0363,right=width*.9637,top=height*.018,bottom=height*.9455;
 let logoPixels=0,frameChroma=0,edgeChroma=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*channels;
  if(Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2])<=16)continue;
  if(y>=height*.93&&x>=width*.65){logoPixels++;continue;}
  const frame=((Math.abs(x-left)<3||Math.abs(x-right)<3)&&y>=top-3&&y<=bottom+3)||((Math.abs(y-top)<3||Math.abs(y-bottom)<3)&&x>=left-3&&x<=right+3);
  if(frame)frameChroma++;else edgeChroma++;
 }
 if(logoPixels<100)throw Error('Supplied logo missing');
 if(edgeChroma/(width*height)>.001)throw Error('Color outside supplied page frame and logo exceeds blank-source tolerance');
 return {logoPixels,frameChroma,edgeChroma};
}

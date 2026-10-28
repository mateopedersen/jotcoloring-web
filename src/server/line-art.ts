/** Open only the deep interiors of large dark masses. Thin strokes, small pupils,
 * original boundary pixels and the image coordinates are retained. O(width*height).
 * This is deterministic raster processing, not a new image/model request. */
export const LINE_ART_PROCESSING_VERSION='open-dark-interiors-v1';
export function openDarkInteriors(raw:Uint8Array,width:number,height:number){
 const size=width*height;
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||size>2_000_000||raw.length!==size*4)throw new Error('Invalid line-art dimensions');
 const scale=Math.min(width,height)/1024;
 const outlineWidth=Math.max(2,Math.round(3*scale)),triggerRadius=Math.max(outlineWidth+3,Math.round(7*scale)),minimumArea=Math.max(80,Math.round(180*scale*scale));
 const distances=new Uint16Array(size),infinity=65535;
 // Every light pixel is a seed. Treat outside the canvas as light as well.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=y*width+x;if(raw[p*4]>=160)continue;
  let distance=x===0||y===0?1:infinity;
  if(x)distance=Math.min(distance,distances[p-1]+1);
  if(y){distance=Math.min(distance,distances[p-width]+1);if(x)distance=Math.min(distance,distances[p-width-1]+1);if(x+1<width)distance=Math.min(distance,distances[p-width+1]+1)}
  distances[p]=distance;
 }
 for(let y=height-1;y>=0;y--)for(let x=width-1;x>=0;x--){
  const p=y*width+x;if(!distances[p])continue;let distance=distances[p];
  if(x===width-1||y===height-1)distance=Math.min(distance,1);
  if(x+1<width)distance=Math.min(distance,distances[p+1]+1);
  if(y+1<height){distance=Math.min(distance,distances[p+width]+1);if(x)distance=Math.min(distance,distances[p+width-1]+1);if(x+1<width)distance=Math.min(distance,distances[p+width+1]+1)}
  distances[p]=distance;
 }
 const visited=new Uint8Array(size),queue=new Int32Array(size);let openedRegions=0,whitenedPixels=0;
 for(let start=0;start<size;start++){
  if(visited[start]||distances[start]<=outlineWidth)continue;
  let head=0,count=1,deepest=distances[start];queue[0]=start;visited[start]=1;
  while(head<count){const p=queue[head++],x=p%width,y=Math.floor(p/width);deepest=Math.max(deepest,distances[p]);
   for(const n of [x>0?p-1:-1,x+1<width?p+1:-1,y>0?p-width:-1,y+1<height?p+width:-1])if(n>=0&&!visited[n]&&distances[n]>outlineWidth){visited[n]=1;queue[count++]=n}
  }
  if(deepest<triggerRadius||count<minimumArea)continue;
  openedRegions++;whitenedPixels+=count;
  for(let i=0;i<count;i++){const p=queue[i]*4;raw[p]=raw[p+1]=raw[p+2]=raw[p+3]=255}
 }
 return {version:LINE_ART_PROCESSING_VERSION,openedRegions,whitenedPixels,outlineWidth,triggerRadius,minimumArea};
}

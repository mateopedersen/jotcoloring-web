// Scanline regions are independent of paint; original line pixels form the immutable boundary.
export function floodRegion(mask: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, threshold = 100, closeGaps = false): number[] {
  if(mask.length!==width*height*4 || width*height>8_000_000) throw new Error('Invalid fill dimensions');
  const sx=Math.floor(startX),sy=Math.floor(startY); if(sx<0||sx>=width||sy<0||sy>=height)return [];
  const blocked=new Uint8Array(width*height),seen=new Uint8Array(width*height);
  for(let i=0;i<blocked.length;i++) blocked[i]=mask[i*4+3]>threshold?1:0;
  if(closeGaps){const source=blocked.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if((source[i-1]&&source[i+1])||(source[i-width]&&source[i+width]))blocked[i]=1;}}
  if(blocked[sy*width+sx])return [];
  const stack=[sy*width+sx],spans:number[]=[];
  while(stack.length){const seed=stack.pop()!;const y=Math.floor(seed/width);let left=seed%width;if(seen[seed]||blocked[seed])continue;while(left>0&&!blocked[y*width+left-1]&&!seen[y*width+left-1])left--;let right=left;let above=false,below=false;
    while(right<width&&!blocked[y*width+right]&&!seen[y*width+right]){const i=y*width+right;seen[i]=1;
      if(y>0){const open=!blocked[i-width]&&!seen[i-width];if(open&&!above)stack.push(i-width);above=open;}
      if(y<height-1){const open=!blocked[i+width]&&!seen[i+width];if(open&&!below)stack.push(i+width);below=open;}
      right++;
    }spans.push(y,left,right-1);
  }return spans;
}

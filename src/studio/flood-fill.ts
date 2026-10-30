// Scanline regions are independent of paint; original line pixels form the immutable boundary.
export function floodRegion(mask: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, threshold = 100, closeGaps = false, tapRadius=0): number[] {
  if(mask.length!==width*height*4 || width*height>8_000_000) throw new Error('Invalid fill dimensions');
  let sx=Math.floor(startX),sy=Math.floor(startY); if(sx<0||sx>=width||sy<0||sy>=height)return [];
  const blocked=new Uint8Array(width*height),seen=new Uint8Array(width*height);
  for(let i=0;i<blocked.length;i++) blocked[i]=mask[i*4+3]>threshold?1:0;
  if(closeGaps){const source=blocked.slice();for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x;if((source[i-1]&&source[i+1])||(source[i-width]&&source[i+width]))blocked[i]=1;}}
  if(blocked[sy*width+sx]&&tapRadius>0){
    // A near-outline tap prefers a nearby small enclosed space over the open
    // background. Exploration is capped so assistance cannot freeze a large page.
    const candidates:{x:number;y:number;distance:number}[]=[];
    for(let r=1;r<=Math.min(12,tapRadius)&&candidates.length<16;r++)for(let dy=-r;dy<=r&&candidates.length<16;dy++)for(let dx=-r;dx<=r&&candidates.length<16;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=sx+dx,y=sy+dy;if(x>=0&&x<width&&y>=0&&y<height&&!blocked[y*width+x])candidates.push({x,y,distance:dx*dx+dy*dy});}
    let best:typeof candidates[number]|undefined,bestScore=Infinity,stamp=0;
    for(const candidate of candidates){const queue=[candidate.y*width+candidate.x];seen[queue[0]]=++stamp;let head=0,border=false;while(head<queue.length&&queue.length<=2048){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(!x||!y||x===width-1||y===height-1)border=true;for(const j of [x?i-1:-1,x+1<width?i+1:-1,y?i-width:-1,y+1<height?i+width:-1])if(j>=0&&!blocked[j]&&seen[j]!==stamp){seen[j]=stamp;queue.push(j);}}
      const score=(queue.length>2048||border?1_000_000:queue.length)+candidate.distance*16;if(score<bestScore){best=candidate;bestScore=score;}
    }seen.fill(0);if(best){sx=best.x;sy=best.y;}
  }
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

import {thinContours} from './contours';
/** Detect endpoints on a temporary skeleton; retain the original tonal drawing.
 * A bridge needs opposing tangents and visible model evidence throughout a short
 * corridor. White space is never connected just to inflate the region count. */
export function repairDrawingGaps(gray:Float32Array,w:number,h:number){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||w*h>1_000_000||gray.length!==w*h||gray.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Invalid drawing-repair map.');
 const mask=Uint8Array.from(gray,v=>1-v>=.08?1:0),thin=thinContours(mask,w,h),neighbors=(i:number)=>{const x=i%w,y=Math.floor(i/w),out:number[]=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){const xx=x+dx,yy=y+dy;if(xx>0&&xx<w-1&&yy>0&&yy<h-1&&thin[yy*w+xx])out.push(yy*w+xx);}return out;};
 const ends:{i:number;x:number;y:number;dx:number;dy:number}[]=[];
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;if(!thin[i])continue;let ns=neighbors(i);if(ns.length!==1)continue;let previous=i,current=ns[0];for(let step=0;step<5;step++){ns=neighbors(current).filter(j=>j!==previous);if(ns.length!==1)break;previous=current;current=ns[0];}const dx=x-current%w,dy=y-Math.floor(current/w),length=Math.hypot(dx,dy);if(length>=2)ends.push({i,x,y,dx:dx/length,dy:dy/length});}
 const radius=Math.max(6,Math.min(12,Math.round(Math.min(w,h)*.015))),cells=new Map<string,number[]>();
 for(let i=0;i<ends.length;i++){const e=ends[i],key=`${Math.floor(e.x/radius)},${Math.floor(e.y/radius)}`;const cell=cells.get(key)||[];cell.push(i);cells.set(key,cell);}
 const candidates:{a:number;b:number;path:number[];cost:number}[]=[];
 for(let a=0;a<ends.length;a++){const e=ends[a],cx=Math.floor(e.x/radius),cy=Math.floor(e.y/radius);for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++)for(const b of cells.get(`${cx+ox},${cy+oy}`)||[]){if(b<=a)continue;const f=ends[b],dx=f.x-e.x,dy=f.y-e.y,d=Math.hypot(dx,dy);if(d<2||d>radius||(e.dx*dx+e.dy*dy)/d<.72||(-f.dx*dx-f.dy*dy)/d<.72||e.dx*f.dx+e.dy*f.dy>-.55)continue;
  const path=[e.i],steps=Math.ceil(d*2);let supported=0,evidence=0,emptyRun=0,maxEmptyRun=0;
  for(let k=1;k<steps;k++){const t=k/steps,x=e.x+dx*t,y=e.y+dy*t;let best=-1,bestInk=-1;
   for(const offset of [-.75,0,.75]){const xx=Math.round(x-dy/d*offset),yy=Math.round(y+dx/d*offset),i=yy*w+xx,ink=1-gray[i];if(ink>bestInk){bestInk=ink;best=i;}}
   path.push(best);evidence+=bestInk;if(bestInk>=.012){supported++;emptyRun=0;}else maxEmptyRun=Math.max(maxEmptyRun,++emptyRun);
  }
  path.push(f.i);if(supported/(steps-1)<.8||evidence/(steps-1)<.025||maxEmptyRun>4)continue;
  candidates.push({a,b,path,cost:d/(.05+evidence/(steps-1))});
 }}
 candidates.sort((a,b)=>a.cost-b.cost);const used=new Set<number>(),output=gray.slice();let repaired=0;
 const draw=(from:number,to:number)=>{const x0=from%w,y0=Math.floor(from/w),dx=to%w-x0,dy=Math.floor(to/w)-y0,n=Math.max(Math.abs(dx),Math.abs(dy));for(let k=0;k<=n;k++){const t=n?k/n:0,i=Math.round(y0+dy*t)*w+Math.round(x0+dx*t);output[i]=Math.min(output[i],.72);}};
 for(const c of candidates){if(used.has(c.a)||used.has(c.b))continue;for(let i=1;i<c.path.length;i++)draw(c.path[i-1],c.path[i]);used.add(c.a);used.add(c.b);repaired++;}
 return{gray:output,repaired};
}

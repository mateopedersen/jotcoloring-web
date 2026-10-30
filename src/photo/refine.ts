import type {DrawingMap} from './drawing';
import {validateSettings,type OutlineSettings} from './outline';
import {thinContours} from './contours';
/** Source-supported cleanup of a learned drawing. The output keeps the same
 * coordinate grid and never synthesizes an object, face, crop, or background. */
export function refineDrawingMap(map:DrawingMap,rgba:Uint8ClampedArray,sourceWidth:number,sourceHeight:number,settings:OutlineSettings):DrawingMap{
 validateSettings(settings);const {width:w,height:h}=map,n=w*h;if(!Number.isInteger(w)||!Number.isInteger(h)||w<8||h<8||map.gray.some(v=>!Number.isFinite(v)||v<0||v>1)||map.gray.length!==n||rgba.length!==sourceWidth*sourceHeight*4||n>1_000_000)throw new Error('Invalid refinement image.');
 const gray=new Float32Array(n),ink=new Float32Array(n),luma=new Float32Array(n),chroma=new Float32Array(n),support=new Float32Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,xx=Math.min(sourceWidth-1,Math.floor((x+.5)*sourceWidth/w)),yy=Math.min(sourceHeight-1,Math.floor((y+.5)*sourceHeight/h)),p=(yy*sourceWidth+xx)*4,a=rgba[p+3]/255,r=rgba[p]*a+255*(1-a),g=rgba[p+1]*a+255*(1-a),b=rgba[p+2]*a+255*(1-a);luma[i]=(.2126*r+.7152*g+.0722*b)/255;chroma[i]=(Math.max(r,g,b)-Math.min(r,g,b))/255;ink[i]=Math.max(0,Math.min(1,1-map.gray[i]));}
 // Symmetric low-pass differences separate broad boundaries from one-pixel texture.
 for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){const i=y*w+x;let best=0;for(const field of [luma,chroma]){const gx=(field[i+2]+field[i-w+2]+field[i+w+2]-field[i-2]-field[i-w-2]-field[i+w-2])/3,gy=(field[i+2*w]+field[i+2*w-1]+field[i+2*w+1]-field[i-2*w]-field[i-2*w-1]-field[i-2*w+1])/3;best=Math.max(best,Math.hypot(gx,gy));}support[i]=best;}
 const cleanup=settings.cleanup??55,low=.009+(100-settings.detail)*.0002+cleanup*.00015,high=.065+(100-settings.detail)*.00075+cleanup*.00055,eligible=new Uint8Array(n),seen=new Uint8Array(n),keep=new Uint8Array(n),queue=new Uint32Array(n);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;let evidence=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)evidence=Math.max(evidence,support[i+dy*w+dx]);eligible[i]=ink[i]>low&&(ink[i]>high*.65||evidence>.014)?1:0;}
 for(let start=0;start<n;start++){if(!eligible[start]||seen[start])continue;let head=0,tail=1,strong=0,maxInk=0;queue[0]=start;seen[start]=1;
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);maxInk=Math.max(maxInk,ink[i]);if(ink[i]>=high)strong++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const j=yy*w+xx;if(eligible[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}}
  // Isolated strong dots can be eyes or printed marks; weak texture needs a real stroke.
  const minimum=settings.detail>75?2:settings.detail>35?4:8;if((strong>0&&tail>=minimum)||(tail>=16&&maxInk>=high*.72))for(let k=0;k<tail;k++)keep[queue[k]]=1;
 }
 // Remove short, weak twigs attached to an otherwise useful outline. Work on
 // a temporary topology map so closed loops (eyes, buttons) survive intact.
 const core=Uint8Array.from(ink,(v,i)=>keep[i]&&v>.09?1:0),skeleton=thinContours(core,w,h),remove=new Uint8Array(n),limit=Math.round(2+cleanup*.22);
 const neighbors=(i:number,except=-1)=>{const x=i%w,y=Math.floor(i/w),out:number[]=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy,j=yy*w+xx;if(xx>0&&xx<w-1&&yy>0&&yy<h-1&&j!==except&&skeleton[j])out.push(j);}return out;};
 for(let i=0;i<n;i++)if(skeleton[i]&&neighbors(i).length===1){const branch=[i];let prev=-1,current=i,joined=false,peak=ink[i];for(let k=0;k<limit;k++){const ns=neighbors(current,prev);if(ns.length>1){joined=true;break;}if(ns.length!==1)break;prev=current;current=ns[0];branch.push(current);peak=Math.max(peak,ink[current]);}if(joined&&branch.length<limit&&peak<.4)for(const j of branch.slice(0,-1))remove[j]=1;}
 if(remove.some(Boolean))for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(!keep[i])continue;let discarded=false,retained=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const j=i+dy*w+dx;if(remove[j])discarded=true;if(skeleton[j]&&!remove[j])retained=true;}if(discarded&&!retained&&ink[i]<.4)keep[i]=0;}
 for(let i=0;i<n;i++)gray[i]=keep[i]?1-ink[i]:1;
 // Retain the original subpixel fringe around kept strokes for smooth printing.
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(keep[i]||remove[i]||ink[i]<low*.45)continue;let adjacent=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(keep[i+dy*w+dx])adjacent=true;if(adjacent)gray[i]=1-ink[i]*.6;}
 return{width:w,height:h,gray};
}

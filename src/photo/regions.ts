/** Photo-guided, marker-controlled region closure. Markers come from existing
 * white spaces, never a grid or invented object layout. A small trapped-ball
 * radius tolerates breaks; a watershed returns to the original ink ridges.
 * Weak boundaries with little photographic contrast are merged away.
 */
const MAX_SIDE=900;
function sample(data:ArrayLike<number>,w:number,h:number,x:number,y:number,stride=1,channel=0){
 x=Math.max(0,Math.min(w-1,x));y=Math.max(0,Math.min(h-1,y));const xx=Math.floor(x),yy=Math.floor(y),fx=x-xx,fy=y-yy,x1=Math.min(w-1,xx+1),y1=Math.min(h-1,yy+1);
 return (data[(yy*w+xx)*stride+channel]*(1-fx)+data[(yy*w+x1)*stride+channel]*fx)*(1-fy)+(data[(y1*w+xx)*stride+channel]*(1-fx)+data[(y1*w+x1)*stride+channel]*fx)*fy;
}
function blur(input:Float32Array,w:number,h:number,sigma=.6){
 const radius=Math.ceil(sigma*2.5),kernel=Array.from({length:radius*2+1},(_,i)=>Math.exp(-((i-radius)**2)/(2*sigma*sigma))),sum=kernel.reduce((a,b)=>a+b,0),temp=new Float32Array(input.length),output=new Float32Array(input.length);for(let i=0;i<kernel.length;i++)kernel[i]/=sum;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++)v+=input[y*w+Math.max(0,Math.min(w-1,x+k))]*kernel[k+radius];temp[y*w+x]=v;}
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let k=-radius;k<=radius;k++)v+=temp[Math.max(0,Math.min(h-1,y+k))*w+x]*kernel[k+radius];output[y*w+x]=v;}
 return output;
}
function photoGradient(rgba:Uint8ClampedArray,width:number,height:number,w:number,h:number){
 const n=w*h,channels=[new Float32Array(n),new Float32Array(n),new Float32Array(n)],linear=new Float32Array(256);
 for(let i=0;i<256;i++){const v=i/255;linear[i]=v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}
 const lab=(v:number)=>v>.008856?Math.cbrt(v):7.787*v+16/116;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const sx=(x+.5)*width/w-.5,sy=(y+.5)*height/h-.5,a=sample(rgba,width,height,sx,sy,4,3)/255;
  const rgb=[0,1,2].map(c=>linear[Math.round(sample(rgba,width,height,sx,sy,4,c)*a+255*(1-a))]);
  const xx=lab((rgb[0]*.4124564+rgb[1]*.3575761+rgb[2]*.1804375)/.95047),yy=lab(rgb[0]*.2126729+rgb[1]*.7151522+rgb[2]*.072175),zz=lab((rgb[0]*.0193339+rgb[1]*.119192+rgb[2]*.9503041)/1.08883),i=y*w+x;
  channels[0][i]=116*yy-16;channels[1][i]=500*(xx-yy);channels[2][i]=200*(yy-zz);
 }
 const gradient=new Float32Array(n);
 for(const channel of channels){const c=blur(channel,w,h,1.4);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=y*w+x,gx=(c[i-w+1]+2*c[i+1]+c[i+w+1]-c[i-w-1]-2*c[i-1]-c[i+w-1])/8,gy=(c[i+w-1]+2*c[i+w]+c[i+w+1]-c[i-w-1]-2*c[i-w]-c[i-w+1])/8;gradient[i]+=Math.hypot(gx,gy);
 }}
 const supported=new Float32Array(n);for(let y=0;y<h;y++)for(let x=0;x<w;x++){let v=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)v=Math.max(v,gradient[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))]);supported[y*w+x]=v;}
 return supported;
}

class PixelHeap{
 private positions:Uint32Array;private values:Float32Array;private ages:Uint32Array;private length=0;private age=0;
 constructor(capacity:number){this.positions=new Uint32Array(capacity);this.values=new Float32Array(capacity);this.ages=new Uint32Array(capacity);}
 get size(){return this.length;}
 push(position:number,value:number){let i=this.length++;const age=++this.age;while(i){const p=(i-1)>>1;if(this.values[p]<value||this.values[p]===value&&this.ages[p]<age)break;this.positions[i]=this.positions[p];this.values[i]=this.values[p];this.ages[i]=this.ages[p];i=p;}this.positions[i]=position;this.values[i]=value;this.ages[i]=age;}
 pop(){const position=this.positions[0],value=this.values[0],last=--this.length,p=this.positions[last],v=this.values[last],age=this.ages[last];let i=0;
  while(i*2+1<last){let child=i*2+1;if(child+1<last&&(this.values[child+1]<this.values[child]||this.values[child+1]===this.values[child]&&this.ages[child+1]<this.ages[child]))child++;
   if(v<this.values[child]||v===this.values[child]&&age<this.ages[child])break;this.positions[i]=this.positions[child];this.values[i]=this.values[child];this.ages[i]=this.ages[child];i=child;}
  if(last){this.positions[i]=p;this.values[i]=v;this.ages[i]=age;}return {position,value};
 }
}

export interface RegionClosure{boundary:Uint8Array;closedRegions:number;width:number;height:number}
export function coloringBoundaries(gray:Uint8Array,width:number,height:number,rgba:Uint8ClampedArray):RegionClosure{
 if(gray.length!==width*height||rgba.length!==width*height*4||width<8||height<8||width*height>2_400_000)throw new Error('Invalid coloring-area pixels.');
 const scale=Math.min(1,MAX_SIDE/Math.max(width,height)),w=Math.max(8,Math.round(width*scale)),h=Math.max(8,Math.round(height*scale)),n=w*h;
 const small=new Float32Array(n),blocked=new Uint8Array(n),radius=Math.max(2,Math.min(4,Math.round(Math.min(w,h)*.005))),offsets:number[][]=[];
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius)offsets.push([dx,dy]);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)small[y*w+x]=sample(gray,width,height,(x+.5)*width/w-.5,(y+.5)*height/h-.5);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(small[y*w+x]<230)for(const[dx,dy]of offsets){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)blocked[yy*w+xx]=1;}
 const labels=new Int32Array(n),visited=new Uint8Array(n),queue=new Uint32Array(n),minimum=Math.max(24,Math.round(n*.00012));let label=0;
 const neighbors=(i:number)=>{const x=i%w,y=Math.floor(i/w);return [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1];};
 for(let start=0;start<n;start++){
  if(blocked[start]||visited[start])continue;let head=0,tail=1;queue[0]=start;visited[start]=1;
  while(head<tail){const i=queue[head++];for(const j of neighbors(i))if(j>=0&&!blocked[j]&&!visited[j]){visited[j]=1;queue[tail++]=j;}}
  if(tail>=minimum){label++;for(let k=0;k<tail;k++)labels[queue[k]]=label;}
 }
 if(label<2)return {boundary:new Uint8Array(width*height),closedRegions:0,width,height};
 const ink=blur(Float32Array.from(small,v=>1-v/255),w,h),heap=new PixelHeap(n),queued=new Uint8Array(n);
 for(let i=0;i<n;i++)if(labels[i]>0)for(const j of neighbors(i))if(j>=0&&!labels[j]&&!queued[j]){queued[j]=1;heap.push(j,ink[j]);}
 while(heap.size){const{position:i,value}=heap.pop();let owner=0,collision=false;
  for(const j of neighbors(i))if(j>=0&&labels[j]>0){if(owner&&owner!==labels[j])collision=true;owner=labels[j];}
  if(collision){labels[i]=-1;continue;}if(!owner)continue;labels[i]=owner;
  for(const j of neighbors(i))if(j>=0&&!labels[j]&&!queued[j]){queued[j]=1;heap.push(j,Math.max(value,ink[j]));}
 }
 const gradient=photoGradient(rgba,width,height,w,h),parent=Int32Array.from({length:label+1},(_,i)=>i),edges=new Map<number,{a:number;b:number;count:number;gradient:number;strong:number}>();
 const adjacent=(i:number)=>{const x=i%w,y=Math.floor(i/w),ids:number[]=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;const id=labels[yy*w+xx];if(id>0&&!ids.includes(id))ids.push(id);}return ids;};
 for(let i=0;i<n;i++)if(labels[i]<=0){const ids=adjacent(i);if(ids.length!==2)continue;const a=Math.min(...ids),b=Math.max(...ids),key=a*(label+1)+b;let edge=edges.get(key);if(!edge){edge={a,b,count:0,gradient:0,strong:0};edges.set(key,edge);}edge.count++;edge.gradient+=gradient[i];if(small[i]<120)edge.strong++;}
 const find=(id:number)=>{while(parent[id]!==id){parent[id]=parent[parent[id]];id=parent[id];}return id;};
 for(const edge of edges.values())if(edge.gradient/edge.count<5&&edge.strong/edge.count<.8){const a=find(edge.a),b=find(edge.b);if(a!==b)parent[b]=a;}
 const boundary=new Uint8Array(n);
 for(let i=0;i<n;i++)if(labels[i]<=0){const roots=adjacent(i).map(find);if(roots.some(id=>id!==roots[0]))boundary[i]=1;}
 const full=new Uint8Array(width*height),sx=width/w,sy=height/h;
 const line=(x0:number,y0:number,x1:number,y1:number)=>{const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));for(let k=0;k<=steps;k++){const t=steps?k/steps:0,x=Math.round(x0+(x1-x0)*t),y=Math.round(y0+(y1-y0)*t);if(x>=0&&x<width&&y>=0&&y<height)full[y*width+x]=1;}};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(boundary[y*w+x]){
  const xx=Math.round((x+.5)*sx-.5),yy=Math.round((y+.5)*sy-.5);line(xx,yy,xx,yy);
  for(const[dx,dy]of[[1,0],[-1,1],[0,1],[1,1]]){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<w&&ny<h&&boundary[ny*w+nx])line(xx,yy,Math.round((nx+.5)*sx-.5),Math.round((ny+.5)*sy-.5));}
 }
 return {boundary:full,closedRegions:new Set(Array.from({length:label},(_,i)=>find(i+1))).size,width,height};
}

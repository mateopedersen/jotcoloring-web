import type {ObjectRegion} from '../model';
export const n=(v:number)=>String(Math.round(v*100)/100);
export const oval=(x:number,y:number,rx:number,ry=rx)=>`M${n(x-rx)} ${n(y)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2*rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2*rx)} 0Z`;
export const poly=(points:number[][])=>points.map(([x,y],i)=>`${i?'L':'M'}${n(x)} ${n(y)}`).join(' ')+'Z';
export const rect=(x:number,y:number,w:number,h:number,r=0)=>`M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`;
export const star=(x:number,y:number,r:number,points=5,inner=.45)=>poly(Array.from({length:points*2},(_,i)=>{const a=-Math.PI/2+i*Math.PI/points,rr=i%2?r*inner:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];}));
export const leaf=(x:number,y:number,w:number,h:number)=>`M${x} ${y+h}Q${x-w} ${y+h*.4} ${x} ${y}Q${x+w} ${y+h*.4} ${x} ${y+h}Z`;
export const heart=(x:number,y:number,r:number)=>`M${x} ${y+r}C${x-r*1.6} ${y} ${x-r} ${y-r*1.4} ${x} ${y-r*.4}C${x+r} ${y-r*1.4} ${x+r*1.6} ${y} ${x} ${y+r}Z`;
export const part=(id:string,path:string,fill?:string):ObjectRegion=>({id,label:id.replace(/-/g,' ').replace(/^./,s=>s.toUpperCase()),path,...(fill?{fill}:{})});
export const eye=(x:number,y:number,r=3)=>part('eyes',oval(x,y,r),'#171717');
export const petalFlower=(x:number,y:number,r:number,count=6)=>[
 ...Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return part(`petal-${i+1}`,oval(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,r*.4));}),part('center',oval(x,y,r*.28))];
export const wheel=(x:number,y:number,r=20)=>[part('tires',oval(x,y,r)),part('hubs',oval(x,y,r*.45))];
export const eyes=(x=128,y=94,space=24)=>[eye(x-space,y),eye(x+space,y)];
export const hatch=(x:number,y:number,w:number,h:number,count:number)=>Array.from({length:count},(_,i)=>`M${n(x+(i+1)*w/(count+1))} ${y}v${h}`);

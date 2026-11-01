import {customTip,stampStroke} from './brush-tip';
import type {Operation,Stroke,Shape} from './model';
import {symmetryPoints,boundsOfSpans,paintStyle} from './creative';

const brushTiles=new Map<string,HTMLCanvasElement>();
function clipSpans(c:CanvasRenderingContext2D,spans?:number[]){if(!spans?.length)return;c.beginPath();for(let i=0;i<spans.length;i+=3)c.rect(spans[i+1],spans[i],spans[i+2]-spans[i+1]+1,1);c.clip();}
function brushStroke(c:CanvasRenderingContext2D,op:Stroke,points:Stroke['points']){
 if(customTip(op.tip)){stampStroke(c,op,points);return;}
 const style=op.brush||'round';c.strokeStyle=op.color;c.fillStyle=op.color;c.lineWidth=op.size;c.lineCap='round';c.lineJoin='round';
 if(style==='marker'&&!op.erase){c.globalCompositeOperation='multiply';c.globalAlpha*=.48;c.lineCap='square';}
 if((style==='pencil'||style==='crayon')&&!op.erase){const key=style+op.color;let tile=brushTiles.get(key);if(!tile){tile=document.createElement('canvas');tile.width=tile.height=48;const t=tile.getContext('2d')!;let seed=23471;t.fillStyle=op.color;for(let y=0;y<48;y++)for(let x=0;x<48;x++){seed=(seed*16807)%2147483647;t.globalAlpha=style==='pencil'?.18+seed/2147483647*.65:.35+seed/2147483647*.65;if(seed%7!==0)t.fillRect(x,y,1,1);}brushTiles.set(key,tile);if(brushTiles.size>48)brushTiles.delete(brushTiles.keys().next().value!);}c.strokeStyle=c.fillStyle=c.createPattern(tile,'repeat')||op.color;}
 if(style==='airbrush'&&!op.erase){for(let i=0;i<points.length;i++){const a=points[Math.max(0,i-1)],b=points[i],d=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(d/Math.max(1,op.size*.2)));for(let j=0;j<steps;j++){const x=a.x+(b.x-a.x)*j/steps,y=a.y+(b.y-a.y)*j/steps,r=op.size/2*(op.pressure?Math.max(.12,b.pressure??.5):1),g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,op.color);g.addColorStop(1,op.color+'00');c.fillStyle=g;c.globalAlpha=op.opacity*.18;c.fillRect(x-r,y-r,r*2,r*2);}}return;}
 // Pointer-up may append the same coordinate as pointer-down. Browsers can
 // discard a zero-length stroked path, so retain its filled tap footprint.
 const draw=(factor=1)=>{if(points.length===1||points.every(p=>Math.hypot(p.x-points[0].x,p.y-points[0].y)<.001)){c.beginPath();c.arc(points[0].x,points[0].y,op.size*factor/2*(op.pressure?Math.max(.12,points[0].pressure??.5):1),0,Math.PI*2);c.fill();return;}if(op.pressure){for(let i=1;i<points.length;i++){c.lineWidth=op.size*factor*Math.max(.12,((points[i].pressure??.5)+(points[i-1].pressure??.5))/2);c.beginPath();c.moveTo(points[i-1].x,points[i-1].y);c.lineTo(points[i].x,points[i].y);c.stroke();}}else{c.lineWidth=op.size*factor;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}};
 if(style==='watercolor'&&!op.erase){c.globalAlpha=op.opacity*.22;for(const factor of [1.2,1,.72]){draw(factor);}}else draw();
}
export function shapePath(c:CanvasRenderingContext2D,op:Shape){const{x:x1,y:y1}=op.start,{x:x2,y:y2}=op.end,x=Math.min(x1,x2),y=Math.min(y1,y2),w=Math.max(1,Math.abs(x2-x1)),h=Math.max(1,Math.abs(y2-y1));c.beginPath();
 if(op.shape==='line'){c.moveTo(x1,y1);c.lineTo(x2,y2);}
 else if(op.shape==='rectangle')c.rect(x,y,w,h);
 else if(op.shape==='ellipse')c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
 else if(op.shape==='heart'){c.moveTo(x+w/2,y+h);c.bezierCurveTo(x-w*.25,y+h*.45,x,y-h*.25,x+w/2,y+h*.23);c.bezierCurveTo(x+w,y-h*.25,x+w*1.25,y+h*.45,x+w/2,y+h);c.closePath();}
 else{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?.22:.5,px=x+w/2+Math.cos(a)*w*r,py=y+h/2+Math.sin(a)*h*r;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();}
 return{x,y,width:w,height:h};
}
export function paintOperation(c:CanvasRenderingContext2D,op:Operation,width:number,height:number){c.save();c.globalAlpha=op.opacity;
 if(op.kind==='fill'){if(!op.spans.length){c.restore();return;}const b=boundsOfSpans(op.spans);clipSpans(c,op.spans);c.fillStyle=paintStyle(c,op.color,op.effect,b);c.fillRect(b.x,b.y,b.width,b.height);}
 else{clipSpans(c,op.clip);if(op.kind==='stroke'){c.globalCompositeOperation=op.erase?'destination-out':'source-over';const copies=op.points.map(p=>symmetryPoints(p,op.symmetry,width,height));for(let i=0;i<(copies[0]?.length||0);i++){c.save();brushStroke(c,op,copies.map(row=>row[i]));c.restore();}}
 else{const starts=symmetryPoints(op.start,op.symmetry,width,height),ends=symmetryPoints(op.end,op.symmetry,width,height);for(let i=0;i<starts.length;i++){const b=shapePath(c,{...op,start:starts[i],end:ends[i]});c.lineWidth=op.size;c.lineCap='round';c.lineJoin='round';c.strokeStyle=op.color;c.fillStyle=paintStyle(c,op.color,op.effect,b);if(op.filled&&op.shape!=='line')c.fill();else c.stroke();}}}
 c.restore();
}

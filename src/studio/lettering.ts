import type {TextObject} from './model';
export const LETTERING_STYLES=[
 {id:'classic',name:'Classic story',font:'Georgia, serif',weight:700,italic:false,outline:false},
 {id:'bold',name:'Bold & bright',font:'Arial, sans-serif',weight:900,italic:false,outline:false},
 {id:'outline',name:'Color-in letters',font:'Arial, sans-serif',weight:900,italic:false,outline:true},
 {id:'script',name:'Handwritten note',font:'cursive',weight:500,italic:true,outline:false},
 {id:'typewriter',name:'Typewriter',font:'monospace',weight:600,italic:false,outline:false},
 {id:'serif-outline',name:'Storybook outline',font:'Georgia, serif',weight:700,italic:false,outline:true},
 {id:'round',name:'Soft & rounded',font:'"Trebuchet MS", sans-serif',weight:700,italic:false,outline:false},
 {id:'slant',name:'Adventure italic',font:'Arial, sans-serif',weight:900,italic:true,outline:true},
] as const;
export function applyLetterStyle(text:TextObject,id:string){const style=LETTERING_STYLES.find(s=>s.id===id);if(!style)return;Object.assign(text,{font:style.font,weight:style.weight,italic:style.italic,outline:style.outline});}
/** Character placement works for both flat and curved lettering and every export. */
export function textLayout(c:CanvasRenderingContext2D,text:TextObject,line:string){const chars=Array.from(line),tracking=text.letterSpacing||0,widths=chars.map(ch=>c.measureText(ch).width),width=widths.reduce((a,b)=>a+b,0)+Math.max(0,chars.length-1)*tracking,curve=(text.curve||0)*Math.PI/180,offset=text.align==='center'?-width/2:text.align==='right'?-width:0;let cursor=offset;return chars.map((char,i)=>{const mid=cursor+widths[i]/2;cursor+=widths[i]+tracking;if(!curve)return{char,x:mid,y:0,angle:0,width:widths[i]};const radius=Math.max(text.size,width/Math.abs(curve)),angle=(mid-offset-width/2)/radius*Math.sign(curve);return{char,x:Math.sin(angle)*radius+offset+width/2,y:(1-Math.cos(angle))*radius*Math.sign(curve),angle,width:widths[i]};});}

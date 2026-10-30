import {OBJECT_LIBRARY} from '../object-library';
import {STUDIO_SUBJECTS} from './subjects';
import {oval,poly,rect,star,leaf,heart,part as p,petalFlower} from './geometry';
import type {ObjectDefinition,ObjectRegion} from '../model';
const decorations:ObjectDefinition[]=[];
const kinds=['star','sun','moon','heart','flower','leaf','cloud','rainbow','diamond','hexagon','seal','ribbon','oval-frame','square-frame','shield','arch-frame','petal-frame','banner','sparkle','rosette','corner-leaves','wave','medallion','bubble'];
const labels=['Star','Sun','Crescent Moon','Heart','Flower','Leaf','Cloud','Rainbow','Diamond','Hexagon','Award Seal','Ribbon','Oval Frame','Square Frame','Shield','Arched Frame','Petal Frame','Banner','Sparkle','Rosette','Leaf Corners','Ocean Wave','Medallion','Speech Bubble'];
for(let kind=0;kind<kinds.length;kind++)for(let v=0;v<8;v++){
 const id=kinds[kind],steps=5+v;let parts:ObjectRegion[]=[];const lines:string[]=[];
 if(id==='star'||id==='sparkle')parts=[p('star',star(128,128,101,id==='sparkle'?4+v:steps,.36+v*.025)),p('center',star(128,128,42,id==='sparkle'?4+v:steps,.48))];
 if(id==='sun'){parts=Array.from({length:8+v*2},(_,i)=>{const a=i*Math.PI*2/(8+v*2);return p(`ray-${i}`,poly([[128+Math.cos(a)*70,128+Math.sin(a)*70],[128+Math.cos(a-.09)*109,128+Math.sin(a-.09)*109],[128+Math.cos(a+.09)*109,128+Math.sin(a+.09)*109]]));});parts.push(p('sun',oval(128,128,60)),p('center',oval(128,128,43)));}
 if(id==='moon')parts=[p('moon',`M${157-v*2} 24A106 106 0 1 0 ${218-v*2} 195A89 89 0 0 1 ${157-v*2} 24Z`),p('star',star(179,81,24,4+v%4))];
 if(id==='heart')parts=[p('heart',heart(128,111,93)),p('inner-heart',heart(128,115,48+v*3))];
 if(id==='flower')parts=petalFlower(128,128,107,5+v);
 if(id==='leaf'){parts=[p('leaf',leaf(128,18,94,218)),p('stem',rect(124,102,8,135,4))];for(let i=0;i<3+v;i++)lines.push(`M128 ${70+i*130/(v+3)}L${70+i%2*14} ${45+i*130/(v+3)}`,`M128 ${78+i*130/(v+3)}L${186-i%2*14} ${53+i*130/(v+3)}`);}
 if(id==='cloud')parts=[p('cloud',`M44 193Q8 185 18 150Q22 127 49 128Q36 91 74 80Q96 40 136 68Q181 53 197 91Q244 95 238 144Q252 183 216 193Z`),...Array.from({length:v},(_,i)=>p(`drop-${i}`,leaf(51+i*150/Math.max(1,v-1),204,5,24)))];
 if(id==='rainbow'){for(let i=0;i<3+v;i++){const radius=104-i*6;parts.push(p(`band-${i}`,`M${128-radius} 193A${radius} ${radius} 0 0 1 ${128+radius} 193H${122+radius}A${radius-6} ${radius-6} 0 0 0 ${134-radius} 193Z`));}parts.push(p('cloud',oval(42,198,31,18)),p('cloud',oval(213,198,31,18)));}
 if(id==='diamond'||id==='hexagon'){parts=[p('jewel',id==='diamond'?poly([[128,18],[226,116],[128,238],[30,116]]):star(128,128,106,6,Math.cos(Math.PI/6))),p('facet',star(128,128,55+v*4,id==='diamond'?4:6,.82))];for(let i=0;i<4+v;i++)lines.push(`M128 128L${128+Math.cos(i*Math.PI*2/(4+v))*100} ${128+Math.sin(i*Math.PI*2/(4+v))*100}`);}
 if(['seal','medallion','rosette'].includes(id)){parts=[p('ribbons',poly([[71,164],[51,238],[96,214],[116,233],[133,169]])),p('ribbons',poly([[146,167],[143,230],[175,214],[210,236],[188,164]])),p('seal',star(128,111,91,12+v, id==='rosette'?.78:.91)),p('medallion',oval(128,111,62)),p('center',star(128,111,38,4+v))];}
 if(['oval-frame','square-frame','arch-frame','shield','petal-frame'].includes(id)){const outer=id==='oval-frame'?oval(128,128,105,110):id==='shield'?'M26 34Q127 53 230 34V130Q222 205 128 240Q32 205 26 130Z':id==='arch-frame'?'M27 235V108A101 91 0 0 1 229 108V235Z':id==='petal-frame'?star(128,128,115,7+v,.88):rect(20,20,216,216,14+v*6);const inner=id==='oval-frame'?oval(128,128,78,84):id==='shield'?'M48 62Q127 78 208 62V130Q202 186 128 215Q54 186 48 130Z':id==='arch-frame'?'M49 214V112A79 69 0 0 1 207 112V214Z':id==='petal-frame'?star(128,128,86,7+v,.91):rect(45,45,166,166,10+v*4);parts=[{...p('frame',outer+' '+inner),fillRule:'evenodd'}];for(let i=0;i<4+v;i++){const a=i*Math.PI*2/(4+v);parts.push(p(`accent-${i}`,oval(128+Math.cos(a)*94,128+Math.sin(a)*94,3+v*.4)));}}
 if(id==='ribbon'||id==='banner'){parts=[p('tails',poly([[21,78],[83,78],[83,178],[21,178],[45,128]])),p('tails',poly([[173,78],[235,78],[211,128],[235,178],[173,178]])),p('banner',rect(51,55+v*3,154,145-v*6,5+v)),p('inner-banner',rect(65,72+v*3,126,111-v*6,3))];}
 if(id==='corner-leaves'){parts=[p('center',rect(66,66,124,124,16))];for(let i=0;i<3+v;i++){const x=24+i*15;parts.push(p('leaves',leaf(x,24,11,38)),p('leaves',leaf(232-x,195,11,38)));}lines.push('M20 64H228M20 195H228');}
 if(id==='wave'){parts=[p('wave',`M19 179Q58 126 87 153Q53 87 102 52Q158 10 193 72Q156 36 140 78Q127 107 166 132Q207 130 238 178L238 212H19Z`)];for(let i=0;i<2+v;i++)lines.push(`M25 ${181+i*4}Q82 ${164+i*3} 129 ${180+i*4}T230 ${180+i*4}`);}
 if(id==='bubble'){parts=[p('bubble',rect(18,35,220,155,24+v*5)),p('tail',poly([[78,183],[66,227],[127,187]])),p('inner-bubble',rect(33,50,190,121,15+v*5))];}
 decorations.push({id:`element-${id}-${v+1}`,title:`${labels[kind]} · ${v+1}`,category:id.includes('frame')||['banner','ribbon','bubble','shield'].includes(id)?'Frames & Labels':['flower','leaf','corner-leaves','cloud','rainbow','wave','sun','moon'].includes(id)?'Nature Decorations':'Stickers & Symbols',width:256,height:256,regions:parts,outlinePaths:lines});
}
export const ELEMENT_LIBRARY:ObjectDefinition[]=[...STUDIO_SUBJECTS,...decorations,...OBJECT_LIBRARY];
export const ELEMENT_CATEGORIES=[...new Set(ELEMENT_LIBRARY.map(o=>o.category))];
export function searchElements(query:string,category=''){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return ELEMENT_LIBRARY.filter(o=>(!category||o.category===category)&&terms.every(term=>`${o.title} ${o.category} ${o.id}`.toLowerCase().includes(term)));}

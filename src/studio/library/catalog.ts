import {STUDIO_SUBJECTS,STUDIO_SUBJECT_BY_ID,type StudioSubject} from './subjects';
import {n,oval,poly,rect,star,leaf,heart} from './geometry';
export const DETAIL_LEVELS=['Easy','Medium','Hard','Very Hard'] as const;
export type DetailLevel=typeof DETAIL_LEVELS[number];
export const SCENE_LAYOUTS=[
 ['portrait','Open Portrait'],['arch','Arched Window'],['meadow','Gentle Landscape'],['postcard','Picture Postcard'],
 ['circle','Round Frame'],['night','Night Sky'],['triptych','Three Little Views'],['terrarium','Glass Terrarium'],
 ['gallery','Gallery Wall'],['mandala','Radial Mandala'],['wreath','Botanical Wreath'],['glass','Stained Glass'],
 ['atlas','Explorer Map'],['shelf','Display Shelf'],['quilt','Patchwork Quilt'],['rays','Sunburst'],
 ['lace','Lace Border'],['book','Storybook Spread'],['compass','Compass Rose'],['mosaic','Geometric Mosaic'],
] as const;
export type StudioPage={id:string;subject:string;title:string;category:string;layout:number;level:number;detail:DetailLevel;tags:string[]};
export const STUDIO_PAGES:StudioPage[]=STUDIO_SUBJECTS.flatMap(s=>SCENE_LAYOUTS.flatMap(([layout,title],i)=>DETAIL_LEVELS.map((detail,level)=>({id:`v5-${s.id}-${layout}-${level}`,subject:s.id,title:`${s.title} · ${title}`,category:s.category,layout:i,level,detail,tags:s.tags}))));
export const STUDIO_PAGE_BY_ID=new Map(STUDIO_PAGES.map(p=>[p.id,p]));
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const aliases:Record<string,string>={kitty:'cat',kitten:'cat',puppy:'dog',dog:'puppy',bunny:'rabbit',dino:'dinosaur',trex:'tyrannosaurus','t rex':'tyrannosaurus',sea:'ocean',floral:'flower',flowers:'flower',cars:'car',aircraft:'airplane',birthday:'party',football:'soccer',bugs:'insect',insect:'bugs',christmas:'winter',xmas:'winter'};
export type LibraryFilter={query?:string;category?:string;subject?:string;layout?:string;levels?:string[];scope?:'all'|'favorites'|'recent';hideFinished?:boolean;sort?:'recommended'|'az'|'detail';favorites?:string[];recent?:string[];finished?:string[]};
const searchIndex=new Map(STUDIO_PAGES.map(p=>[p.id,normalize(`${p.title} ${p.category} ${p.detail} ${p.tags.join(' ')}`)]));
export function findStudioPages(filter:LibraryFilter={}){const query=normalize(filter.query||''),terms=query.split(' ').filter(Boolean),favorites=new Set(filter.favorites),finished=new Set(filter.finished),recent=new Map((filter.recent||[]).map((id,i)=>[id,i]));
 const scored=STUDIO_PAGES.flatMap(page=>{if(filter.category&&page.category!==filter.category||filter.subject&&page.subject!==filter.subject||filter.layout&&SCENE_LAYOUTS[page.layout][0]!==filter.layout||filter.levels?.length&&!filter.levels.includes(page.detail)||filter.hideFinished&&finished.has(page.id)||filter.scope==='favorites'&&!favorites.has(page.id)||filter.scope==='recent'&&!recent.has(page.id))return[];const text=searchIndex.get(page.id)!;let score=0;for(const term of terms){const variants=[term,term.replace(/s$/,''),aliases[term]].filter(Boolean);const hit=variants.some(v=>text.includes(v));if(!hit)return[];score+=normalize(page.title).includes(term)?4:1;}if(query&&normalize(page.title).startsWith(query))score+=20;return[{page,score}];});
 scored.sort((a,b)=>filter.scope==='recent'?(recent.get(a.page.id)??0)-(recent.get(b.page.id)??0):filter.sort==='az'?a.page.title.localeCompare(b.page.title)||a.page.level-b.page.level:filter.sort==='detail'?a.page.level-b.page.level||a.page.title.localeCompare(b.page.title):b.score-a.score||a.page.layout-b.page.layout||a.page.level-b.page.level||a.page.subject.localeCompare(b.page.subject));return scored.map(r=>r.page);
}
export function pageAtLevel(page:StudioPage,level:number){return STUDIO_PAGE_BY_ID.get(`v5-${page.subject}-${SCENE_LAYOUTS[page.layout][0]}-${Math.max(0,Math.min(3,level))}`)!;}
export function dailyPage(date=new Date()){const days=Math.floor(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000);return STUDIO_PAGES[(days*7919) % STUDIO_PAGES.length];}
const path=(d:string,attrs='')=>`<path d="${d}" ${attrs}/>`;
const ring=(x:number,y:number,r:number)=>path(oval(x,y,r));
function flower(x:number,y:number,r:number,petals=6){return Array.from({length:petals},(_,i)=>{const t=i*Math.PI*2/petals;return ring(x+Math.cos(t)*r*.6,y+Math.sin(t)*r*.6,r*.4);}).join('')+ring(x,y,r*.26);}
function ornaments(world:StudioSubject['world'],x:number,y:number,r:number,index:number){return world==='sky'?path(star(x,y,r,index%2?4:5)):world==='water'?path(leaf(x,y-r,r*.4,r*2)):world==='indoor'?path(index%2?heart(x,y,r*.7):poly([[x,y-r],[x+r,y],[x,y+r],[x-r,y]])):world==='pattern'?flower(x,y,r,8):index%2?path(leaf(x,y-r,r*.55,r*2)):flower(x,y,r);}
function texture(level:number,seed:number){if(!level)return'';const step=[0,68,38,23][level],shapes:string[]=[];for(let y=28;y<247;y+=step)for(let x=25;x<245;x+=step){const xx=x+(Math.floor(y/step)%2?step/2:0);shapes.push(seed%3===0?path(poly([[xx,y-7],[xx+7,y],[xx,y+7],[xx-7,y]])):seed%3===1?ring(xx,y,level===1?8:5):path(leaf(xx,y-7,7,15)));}return shapes.join('');}
function drawing(s:StudioSubject,x:number,y:number,size:number,level:number,token:string,seed:number){const scale=size/256,body=s.regions.find(r=>/^(body|shell|fruit|case|walls|lantern|ball|pot|icing|deck|jar|bell|head|leaf|center|candy)$/.test(r.id));let patterns='';if(body&&level)patterns=`<defs><clipPath id="${token}">${path(body.path)}</clipPath></defs><g clip-path="url(#${token})" fill="none" stroke-width="${level===3?1.25:1.7}">${texture(level,seed)}</g>`;
 return `<g transform="translate(${n(x-size/2)} ${n(y-size/2)}) scale(${n(scale)})" stroke-width="${n(Math.max(2,2.1/scale))}">${s.regions.map(r=>path(r.path,`fill="${r.fill||'#fff'}"`)).join('')}${patterns}${(s.outlinePaths||[]).map(d=>path(d,'fill="none"')).join('')}</g>`;}
export function studioPageSvg(page:StudioPage,{width=1024,height=1408}: {width?:number;height?:number}={}){const s=STUDIO_SUBJECT_BY_ID.get(page.subject);if(!s)throw new Error('Unknown Studio subject');const l=Math.max(0,Math.min(3,page.level));const edge=38,pads=18+l*8;let back='',front='',x=400,y=560,size=500,copy=0;const draw=(a:number,b:number,c:number,d=l)=>drawing(s,a,b,c,d,`d${copy++}`,page.layout);const motif=(a:number,b:number,r:number,i=0)=>ornaments(s.world,a,b,r,i);
 switch(page.layout){
 case 0: size=570;back=path(rect(74,100,652,875,44),'fill="none"');front=motif(400,965,32);break;
 case 1:back=path('M80 990V385A320 320 0 0 1 720 385V990Z')+path('M104 965V391A296 296 0 0 1 696 391V965Z','fill="none"');size=460;y=590;front=motif(400,226,55);break;
 case 2:back=path('M40 765Q190 660 345 735Q560 639 760 731V1060H40Z')+ring(622,183,66);front=Array.from({length:3+l*2},(_,i)=>motif(80+i*640/(2+l*2),951+(i%2)*40,24+l*2,i)).join('');y=610;size=475;break;
 case 3:back=path(rect(84,110,632,850,6));front=path('M115 860H685','fill="none"')+motif(620,213,55)+motif(400,1005,26);size=485;y=538;break;
 case 4:back=path(oval(400,535,325,430))+path(oval(400,535,300,402),'fill="none"');size=480;y=540;front=motif(400,915,30);break;
 case 5:back=path('M611 82A94 94 0 1 0 706 199A82 82 0 0 1 611 82Z');front=Array.from({length:7+l*5},(_,i)=>{const a=i*2.399;return path(star(400+Math.cos(a)*(268+(i%2)*53),550+Math.sin(a)*(360+(i%3)*30),14+i%3*5));}).join('');size=458;break;
 case 6:back=path(rect(67,62,666,990,20));front=draw(271,321,350,Math.max(0,l-1))+draw(510,772,350)+path('M80 547H720','fill="none"');size=0;break;
 case 7:back=path('M178 77H622L729 844L632 1000H168L71 844Z')+path('M178 77L279 844L168 1000M622 77L521 844L632 1000M71 844H729','fill="none"');y=597;size=430;front=motif(172,856,36)+motif(630,856,36,1);break;
 case 8:back=path(rect(84,130,352,461,12))+path(rect(455,130,251,310,12))+path(rect(356,619,351,383,12))+path(rect(83,649,252,351,12));size=0;front=draw(260,371,330)+draw(580,281,232,Math.max(0,l-1))+draw(530,819,320)+draw(207,829,224,Math.max(0,l-1));break;
 case 9:{size=315;const count=8+l*4;back=ring(400,550,165);front=Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return motif(400+Math.cos(a)*285,550+Math.sin(a)*400,33,l+i);}).join('');y=550;break;}
 case 10:{size=480;const count=10+l*4;front=Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count;return motif(400+Math.cos(a)*293,540+Math.sin(a)*433,25+l*3,i);}).join('');back=path(oval(400,540,294,432),'fill="none"');break;}
 case 11:back=path(rect(65,80,670,940,25));for(let i=0;i<8+l*4;i++){const a=i*Math.PI*2/(8+l*4);back+=path(`M400 535L${n(400+Math.cos(a)*500)} ${n(535+Math.sin(a)*700)}`,'fill="none"');}back+=path(oval(400,535,242,312));y=540;size=450;break;
 case 12:back=path('M68 97L256 73L458 107L725 71V990L493 1033L264 991L67 1029Z')+path('M256 73L264 991M458 107L493 1033','fill="none"');front=motif(171,223,59)+motif(619,907,59,1);size=450;y=554;break;
 case 13:back=path(rect(54,89,692,894,16))+path(rect(72,548,655,27,4))+path(rect(72,938,655,27,4));size=0;front=draw(267,346,341)+draw(539,757,340)+motif(571,426,76,1)+motif(239,824,76);break;
 case 14:{const cols=l>1?5:4,rows=l>1?7:5,w=688/cols,h=966/rows;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const xx=56+c*w,yy=68+r*h;back+=path(rect(xx,yy,w,h));if((c+r)%2===0)front+=motif(xx+w/2,yy+h/2,Math.min(w,h)*.23,c+r);}back+=path(rect(190,288,420,520,24));size=382;y=550;break;}
 case 15:for(let i=0;i<16+l*8;i++){const a=i*Math.PI*2/(16+l*8),b=(i+1)*Math.PI*2/(16+l*8);back+=path(poly([[400,550],[400+Math.cos(a)*850,550+Math.sin(a)*850],[400+Math.cos(b)*850,550+Math.sin(b)*850]]));}back+=path(oval(400,550,245,315));size=440;y=550;break;
 case 16:back=path(rect(98,128,604,842,55))+path(rect(121,151,558,796,42),'fill="none"');front=Array.from({length:10+l*7},(_,i)=>{const a=i*Math.PI*2/(10+l*7);return flower(400+Math.cos(a)*330,550+Math.sin(a)*470,19+l*2);}).join('');size=440;break;
 case 17:back=path('M55 146Q206 78 399 159Q591 78 745 146V964Q579 906 399 986Q210 903 55 964Z')+path('M400 162V984','fill="none"');size=0;front=draw(231,531,320)+draw(570,531,300)+motif(224,849,39)+motif(576,847,39,1);break;
 case 18:back=path(star(400,551,458,8,.73))+path(star(400,551,393,8,.78),'fill="none"')+ring(400,551,253);size=425;y=555;break;
 default:{const cell=80-l*12;for(let yy=65;yy<1040;yy+=cell)for(let xx=47;xx<755;xx+=cell)back+=path(poly([[xx+cell/2,yy],[xx+cell,yy+cell/2],[xx+cell/2,yy+cell],[xx,yy+cell/2]]));back+=path(rect(164,238,472,630,82));size=455;y=555;break;}
 }
 if(l>0){const count=4+l*4;front+=Array.from({length:count},(_,i)=>{const isTop=i<count/2,j=i%(count/2),xx=100+j*600/(count/2-1);return motif(xx,isTop?60+ pads:1038-pads,l===3?16:21,i);}).join('');}
 // Real fine-detail tiers: closed, interleaved ornament bands provide small
 // coloring spaces even when the central subject has an intentionally simple silhouette.
 let detail='';if(l>=2){const columns=l===3?3:1,step=l===3?28:55,r=l===3?10:20;for(let col=0;col<columns;col++)for(let yy=110;yy<1005;yy+=step){const xx=55+col*25;detail+=motif(xx,yy,r,Math.round(yy/step)+col)+motif(800-xx,yy,r,Math.round(yy/step)+col);if(l===3)detail+=ring(xx,yy,3)+ring(800-xx,yy,3);}if(l===3)for(let xx=144;xx<690;xx+=28)detail+=flower(xx,98,11,8)+flower(xx,1004,11,8);}
 if(l>=2&&[0,1,3,4].includes(page.layout)){const peers=STUDIO_SUBJECTS.filter(other=>other.category===s.category&&other.id!==s.id),positions=l===3?[[174,191],[626,191],[174,905],[626,905]]:[[174,191],[626,905]];for(let i=0;i<positions.length;i++){const peer=peers[(i+page.layout)%peers.length];if(peer)detail+=drawing(peer,positions[i][0],positions[i][1],l===3?135:116,l-2,`d${copy++}`,page.layout);}}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 800 1100"><title>${esc(page.title+' · '+page.detail)}</title><desc>${esc(`${s.title} in the ${SCENE_LAYOUTS[page.layout][1].toLowerCase()} composition. ${page.detail} detail level. Original JotColoring Studio line art.`)}</desc><defs><clipPath id="sheet"><rect x="${edge}" y="${edge}" width="${800-edge*2}" height="${1100-edge*2}" rx="16"/></clipPath></defs><rect width="800" height="1100" fill="#fff"/><g stroke="#171717" stroke-width="${l===0?3:2.5}" stroke-linecap="round" stroke-linejoin="round" fill="#fff" clip-path="url(#sheet)">${back}${detail}${size?draw(x,y,size):''}${front}</g></svg>`;
}
export const STUDIO_CATALOG_DESCRIPTION='10,000 ready-to-color compositions · 125 original vector subjects · 20 layouts · 4 detail levels.';

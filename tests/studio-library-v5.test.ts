import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,Path2D} from '@napi-rs/canvas';
import {STUDIO_PAGES,findStudioPages,pageAtLevel,studioPageSvg,dailyPage} from '../src/studio/library/catalog';
import {STUDIO_SUBJECTS,STUDIO_SUBJECT_CATEGORIES} from '../src/studio/library/subjects';
import {ELEMENT_LIBRARY,searchElements} from '../src/studio/library/elements';
import {parseShelf,emptyShelf,mergeShelf,toggleShelf} from '../src/studio/library/shelf';
import {arrangeElements,paletteForElement,centerElement,artworkStats,validateNamedPalettes} from '../src/studio/plus-core';
import {createObject,drawObject,hitObject} from '../src/studio/objects';
import {createProject} from '../src/studio/model';
import {textLayout} from '../src/studio/lettering';
import {validateImportedProject} from '../src/artwork/backup';
import {paintOperation} from '../src/studio/paint-render';
import {symmetryPoints} from '../src/studio/creative';
import {createHash} from 'node:crypto';
(globalThis as any).Path2D=Path2D;
test('library has 10,000 stable compositions from 125 distinct subjects and 25 collections',()=>{
 assert.equal(STUDIO_SUBJECTS.length,125);assert.equal(STUDIO_SUBJECT_CATEGORIES.length,25);assert.equal(STUDIO_PAGES.length,10000);assert.equal(new Set(STUDIO_PAGES.map(p=>p.id)).size,10000);
 for(const level of ['Easy','Medium','Hard','Very Hard'])assert.equal(findStudioPages({levels:[level]}).length,2500);
 assert.equal(ELEMENT_LIBRARY.length,817);assert.equal(new Set(ELEMENT_LIBRARY.map(e=>e.id)).size,817);
 for(const definition of ELEMENT_LIBRARY)for(const path of [...definition.regions.map(r=>r.path),...(definition.outlinePaths||[])]){assert.doesNotMatch(path,/NaN|Infinity|undefined|[<>]/);const bounds=new Path2D(path).computeTightBounds();assert.ok(bounds.every(Number.isFinite),definition.id);}
});
test('search and filters retain their intersection and aliases point to the right subject',()=>{
 assert.equal(findStudioPages({query:'whale'}).length,80);assert.equal(findStudioPages({query:'tennis racket',levels:['Hard']}).length,20);assert.equal(findStudioPages({category:'Ocean Life',levels:['Easy','Medium']}).length,200);
 assert.equal(findStudioPages({query:'bunny',subject:'rabbit'}).length,80);assert.equal(findStudioPages({query:'whale',category:'Music'}).length,0);assert.ok(searchElements('oval frame','Frames & Labels').length===8);
 const p=STUDIO_PAGES[983];const other=pageAtLevel(p,3);assert.equal(other.subject,p.subject);assert.equal(other.layout,p.layout);assert.equal(other.detail,'Very Hard');assert.equal(dailyPage(new Date('2026-10-30Z')).id,dailyPage(new Date('2026-10-30T23:59Z')).id);
});
test('saved shelves merge without duplicate IDs or accepting arbitrary content',()=>{
 const shelf=emptyShelf(),id=STUDIO_PAGES[0].id;toggleShelf(shelf,'favorites',id);toggleShelf(shelf,'finished',id);const copy=parseShelf(JSON.parse(JSON.stringify(shelf)));assert.deepEqual(copy.favorites,[id]);assert.equal(mergeShelf(shelf,copy).favorites.length,1);toggleShelf(shelf,'favorites',id);assert.equal(shelf.favorites.length,0);assert.throws(()=>parseShelf({version:9}));const bad=parseShelf({version:1,favorites:['javascript:alert(1)',{},id],recent:'bad',filter:{query:5}});assert.deepEqual(bad.favorites,[id]);assert.equal(bad.filter.query,'');
});
test('element arrangement respects locked elements and preserves semantic colors',()=>{
 const definitions=STUDIO_SUBJECTS.slice(0,5),objects=definitions.map(d=>createObject(d,1000,1200));objects[0].locked=true;const before=structuredClone(objects[0]);for(const mode of ['row','grid','ring'] as const){arrangeElements(objects,1000,1200,mode);assert.deepEqual(objects[0],before);for(const o of objects.slice(1)){assert.ok(o.x>0&&o.x<1000&&o.y>0&&o.y<1200);assert.ok(o.scale>0);}}
 paletteForElement(objects[1],['#ee1122','#2244ff']);assert.ok(Object.keys(objects[1].colors).length>4);const lockedColors={...objects[0].colors};paletteForElement(objects[0],['#ee1122']);assert.deepEqual(objects[0].colors,lockedColors);centerElement(objects[2],1000,1200,true);assert.equal(objects[2].x,500);assert.equal(objects[2].y,600);
});
test('mirrored elements render and hit-test the same semantic regions',()=>{
 const o=createObject(STUDIO_SUBJECTS.find(s=>s.id==='whale')!,256,256);o.scale=1;o.x=o.y=128;o.flipX=true;o.colors.body='#dd3355';const canvas=createCanvas(256,256),ctx=canvas.getContext('2d');drawObject(ctx as any,o);let hits=0;for(let y=60;y<190;y+=7)for(let x=20;x<230;x+=7){const data=ctx.getImageData(x,y,1,1).data;if(data[0]===221&&data[1]===51){assert.equal(hitObject([o],{x,y},ctx as any)?.region.id,'body');hits++;}}assert.ok(hits>20);
});
test('a decorative frame has an open center that does not cover or intercept the drawing',()=>{const frame=searchElements('oval frame')[0],o=createObject(frame,256,256);o.scale=1;o.x=o.y=128;const canvas=createCanvas(256,256),ctx=canvas.getContext('2d');drawObject(ctx as any,o);assert.equal(ctx.getImageData(128,128,1,1).data[3],0);assert.equal(hitObject([o],{x:128,y:128},ctx as any),null);assert.ok(hitObject([o],{x:30,y:128},ctx as any));});
test('letter spacing and curved text preserve ordering and never generate nonfinite positions',()=>{
 const ctx=createCanvas(600,300).getContext('2d');ctx.font='50px sans-serif';const base={id:'t',text:'Hello',size:50,x:0,y:0,scale:1,rotation:0,align:'center' as const,color:'#222222',visible:true};const plain=textLayout(ctx as any,base,base.text),spaced=textLayout(ctx as any,{...base,letterSpacing:10},base.text),curved=textLayout(ctx as any,{...base,curve:90},base.text);assert.ok(spaced.at(-1)!.x>plain.at(-1)!.x);assert.ok(curved.some(c=>c.y>0));assert.deepEqual(curved.map(p=>p.char),Array.from('Hello'));for(const p of curved)assert.ok([p.x,p.y,p.angle].every(Number.isFinite));
});
test('palette validation strips invalid values and artwork statistics count real paint',()=>{
 const palette=validateNamedPalettes([{id:'x',name:'Ocean',colors:['#ffffff','bad','#ffffff','#112233']},null]);assert.deepEqual(palette[0].colors,['#ffffff','#112233']);const p=createProject({id:'x',title:'x',revision:'1',url:'local:x',width:100,height:100,blob:new Blob()});p.layers[0].operations.push({kind:'stroke',points:[{x:1,y:1}],size:2,color:'#aabbcc',opacity:1,erase:false});assert.deepEqual(artworkStats(p),{marks:1,colors:1,elements:0,letters:0,layers:1});
});
test('SVG metadata is escaped and rendering is deterministic without remote resources',()=>{
 const p={...STUDIO_PAGES[0],title:'<script>"unsafe"</script>'};const svg=studioPageSvg(p);assert.doesNotMatch(svg,/<script|foreignObject|javascript:/);assert.match(svg,/&lt;script&gt;/);assert.equal(studioPageSvg(p),svg);
});
test('new lettering and mirrored locked elements survive validated editable backups',()=>{
 const p=createProject({id:'v5-backup',title:'Lettering',revision:'1',url:'local:test',width:256,height:256,blob:new Blob()});p.objects=[{...createObject(STUDIO_SUBJECTS[0],256,256),flipX:true,flipY:true,locked:true}];p.texts=[{id:'t',text:'Hello',x:128,y:40,size:50,scale:1,rotation:0,align:'center',color:'#334455',visible:true,font:'Arial, sans-serif',weight:900,outline:true,curve:60,letterSpacing:2,lineHeight:1.4,outlineWidth:3,shadow:{color:'#112233',x:3,y:4,blur:5}}];
 const restored=validateImportedProject(structuredClone(p),new Blob());assert.deepEqual(restored.texts,p.texts);assert.deepEqual(restored.objects,p.objects);const bad=structuredClone(p);bad.texts[0].curve=Infinity;assert.throws(()=>validateImportedProject(bad,new Blob()),/lettering/);
});
test('new fill patterns paint distinct colors only inside the provided region',()=>{
 (globalThis as any).document={createElement:()=>createCanvas(1,1)};const hashes=new Set<string>();for(const type of ['weave','bricks','scales']as const){const canvas=createCanvas(100,100),c=canvas.getContext('2d'),spans:number[]=[];for(let y=20;y<80;y++)spans.push(y,20,79);paintOperation(c as any,{kind:'fill',spans,color:'#ff3322',opacity:1,effect:{type,secondary:'#2288ff',angle:0,spacing:24}},100,100);assert.equal(c.getImageData(5,5,1,1).data[3],0);assert.equal(c.getImageData(40,40,1,1).data[3],255);hashes.add(createHash('sha256').update(c.getImageData(0,0,100,100).data).digest('hex'));}assert.equal(hashes.size,3);
});
test('additional radial modes produce unique, evenly rotated points',()=>{for(const count of [12,16]as const){const points=symmetryPoints({x:80,y:50},`radial-${count}`,100,100);assert.equal(points.length,count);assert.equal(new Set(points.map(p=>`${p.x.toFixed(5)},${p.y.toFixed(5)}`)).size,count);for(const p of points)assert.ok(Math.abs(Math.hypot(p.x-50,p.y-50)-30)<1e-7);}});

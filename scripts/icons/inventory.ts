import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import catalog from '../../src/icons/catalog.json';
import {glyphs} from '../../src/icons/glyphs';
import brands from '../../src/sharing/brand-icons.json';
import {OBJECT_LIBRARY} from '../../src/studio/object-library';
const entries:Array<{id:string;kind:string;source:string;status:string;description:string}>=[];
for(const item of catalog.icons)entries.push({id:item.id,kind:'illustration',source:'public'+catalog.url,status:'redrawn',description:item.label});
for(const item of catalog.scenes)entries.push({id:item.id,kind:'scene',source:'public'+catalog.url,status:'redrawn',description:item.viewBox});
for(const name of Object.keys(glyphs))entries.push({id:name,kind:'functional glyph',source:'src/icons/glyphs.ts',status:'standardized',description:'Small controls: one stroke, currentColor, fixed 24-unit canvas'});
for(const name of ['diagonal','right','left','up'])entries.push({id:'arrow-'+name,kind:'direction',source:'src/components/ArrowIcon.astro',status:'redrawn',description:'One clear arrow path; bounded stroke and fixed size'});
for(const name of Object.keys(brands))entries.push({id:name,kind:'social platform mark',source:'src/sharing/brand-icons.json',status:'brand geometry preserved; frame refined',description:'Recognizable platform glyph; license retained'});
for(const item of OBJECT_LIBRARY)entries.push({id:item.id,kind:'colorable Studio object',source:'src/studio/object-library.ts',status:'preserved intentionally',description:'Monochrome editable drawing, not a decorative UI icon'});
const sourceFiles:Array<{path:string;bytes:number;sha256:string;inlineSvgCount:number;symbolCount:number}>=[];
async function walk(dir:string){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory()){await walk(file);continue;}if(!/\.(svg|astro|ts)$/.test(file))continue;const source=await fs.readFile(file,'utf8');if(!/<svg|<symbol|createElementNS/.test(source))continue;sourceFiles.push({path:file,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),inlineSvgCount:(source.match(/<svg\b/g)||[]).length,symbolCount:(source.match(/<symbol\b/g)||[]).length});}}
for(const folder of ['src','public','scripts'])await walk(folder);
for(const [file,description,status] of [
 ['src/components/LostColoringArt.astro','Interactive 404 fox drawing and its new pencil','refined; color interaction preserved'],
 ['public/style-simple.svg','Simple line-style example','redrawn'],['public/style-cute.svg','Cute line-style example','redrawn'],
 ['public/icons/select-chevron.svg','Select arrow','reviewed; deliberately crisp at 14px'],
 ['public/favicon-3d.svg','Approved J pencil brand favicon','brand preserved'],
 ['public/favicon.svg','Unused legacy favicon','retained for old links'],['public/logo.svg','Unused legacy vector wordmark; current site uses approved logo-3d.webp','retained for old links'],
 ['src/photo/files.ts','SVG exports generated from the uploaded image','photo fidelity preserved'],
 ['src/pages/index.astro','Hand-drawn underline, curved annotation arrow and sparkle','reviewed decorative accents'],
 ['src/components/PhotoConverter.astro','Three line-width sample strokes','preserved functional preview'],
 ] as const)entries.push({id:file,kind:'standalone or inline SVG',source:file,status,description});
const bytes=await fs.readFile('public'+catalog.url);
const report={version:'svg-system-3',sprite:catalog.url,bytes:bytes.length,gzipBytes:gzipSync(bytes).length,counts:{illustrations:catalog.icons.length,pageScenes:catalog.scenes.length,functionalGlyphs:Object.keys(glyphs).length,directionArrows:4,socialBrandMarks:Object.keys(brands).length,colorableObjects:OBJECT_LIBRARY.length,sourceFiles:sourceFiles.length},entries,sourceFiles:sourceFiles.sort((a,b)=>a.path.localeCompare(b.path)),compatibilitySheets:['creative-tools-v2.svg','category-3d.svg','artwork-actions.svg'],notes:['The approved logo and social trademarks retain their identities.','The 500 Studio objects and image-derived SVG exports remain colorable; decorative gradients are not applied to them.','An inventory and automated geometry checks do not assert photorealism or error-free behavior on every browser.']};
await fs.mkdir('docs/evidence',{recursive:true});await fs.mkdir('outputs',{recursive:true});
await fs.writeFile('docs/evidence/svg-inventory-v3.json',JSON.stringify(report,null,2)+'\n');
const cols=['id','kind','source','status','description'] as const,escape=(v:string)=>'"'+v.replaceAll('"','""')+'"';
await fs.writeFile('outputs/JotColoring-SVG-Envanteri-2026-10-30.csv','\uFEFF'+cols.join(',')+'\n'+entries.map(row=>cols.map(key=>escape(row[key])).join(',')).join('\n')+'\n');
console.log(JSON.stringify({counts:report.counts,bytes:report.bytes,gzipBytes:report.gzipBytes,entries:entries.length}));

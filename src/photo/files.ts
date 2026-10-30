import {zipSync,strToU8} from 'fflate';
import {brandFooterLayout,brandFooterRGBA} from '../server/branding';
import {buildPdf,enforcePdfLimit} from '../studio/export-core';
import {canvasBlob} from '../studio/render';
import {outlineRGBA,PHOTO_ALGORITHM,type OutlineResult} from './outline';
export type PhotoFormat='pdf'|'webp'|'png'|'jpeg'|'svg'|'docx';
export const PHOTO_FORMATS=[
 {id:'pdf',label:'PDF',extension:'pdf',mime:'application/pdf',hint:'Print-ready · under 1 MB'},
 {id:'webp',label:'Image',extension:'webp',mime:'image/webp',hint:'Lossless WEBP · compact & clear'},
 {id:'png',label:'PNG',extension:'png',mime:'image/png',hint:'Lossless · every outline pixel'},
 {id:'jpeg',label:'JPG',extension:'jpg',mime:'image/jpeg',hint:'Easy to open in everyday apps'},
 {id:'svg',label:'SVG',extension:'svg',mime:'image/svg+xml',hint:'Real vector outline paths'},
 {id:'docx',label:'Word',extension:'docx',mime:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',hint:'Coloring page in a DOCX file'}
] as const;
export const xml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
export function photoFilename(name:string,extension:string){return(name.normalize('NFKC').replace(/\.[^.]+$/,'').replace(/[\\/\u0000-\u001f<>:"|?*]/g,'-').replace(/^\.+|\.+$/g,'').trim().slice(0,95)||'my-photo')+'-coloring-page.'+extension;}
function canvas(width:number,height:number){const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
export function photoPageSize(width:number,height:number){let extra=Math.max(8,Math.round(Math.min(width*.055,height*.065/.935)));for(let i=0;i<4;i++)extra=brandFooterLayout(width,height+extra).footer.height;return{width,height:height+extra,artworkHeight:height};}
/** Append the logo band: none of the photograph's drawing pixels are covered or rescaled. */
export function photoPage(result:OutlineResult){const {width,height}=photoPageSize(result.width,result.height),page=canvas(width,height),ctx=page.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.putImageData(new ImageData(outlineRGBA(result),result.width,result.height),0,0);const footer=brandFooterRGBA(width,height);ctx.putImageData(new ImageData(new Uint8ClampedArray(footer.raw),footer.width,footer.height),0,footer.top);return page;}
function footerOverlay(width:number,height:number){const c=canvas(width,height),f=brandFooterRGBA(width,height);c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.raw),f.width,f.height),0,f.top);return c;}
export function packedPhotoMask(result:OutlineResult){const size=photoPageSize(result.width,result.height),rowBytes=Math.ceil(size.width/8),bytes=new Uint8Array(rowBytes*size.height).fill(255);for(let y=0;y<result.height;y++)for(let x=0;x<result.width;x++)if(result.mask[y*result.width+x])bytes[y*rowBytes+(x>>3)]&=~(128>>(x&7));return{...size,bytes};}
/** Exact union of pixel-aligned black rectangles; SVG artwork is paths, not an embedded photo. */
export function vectorOutlinePath(mask:Uint8Array,width:number,height:number){if(mask.length!==width*height)throw new Error('Invalid vector outline.');const rectangles:number[][]=[];let previous=new Map<string,number>();for(let y=0;y<height;y++){const active=new Map<string,number>();for(let x=0;x<width;){if(!mask[y*width+x]){x++;continue;}const start=x;while(x<width&&mask[y*width+x])x++;const key=`${start}:${x}`,prior=previous.get(key);if(prior!==undefined){rectangles[prior][3]++;active.set(key,prior);}else{if(rectangles.length>=450000)throw new Error('This page has too much fine texture for SVG. Increase smoothing or reduce Detail, then try again.');active.set(key,rectangles.length);rectangles.push([start,y,x-start,1]);}}previous=active;}return rectangles.map(([x,y,w,h])=>`M${x} ${y}h${w}v${h}h-${w}Z`).join('');}
function base64(bytes:Uint8Array){let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);}
export async function svgPhoto(result:OutlineResult,title:string){const {width,height}=photoPageSize(result.width,result.height),f=brandFooterRGBA(width,height),c=canvas(f.width,f.height);c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.raw),f.width,f.height),0,0);const logo=base64(new Uint8Array(await(await canvasBlob(c,'image/png')).arrayBuffer()));return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc"><title id="title">${xml(title)} coloring page</title><desc id="desc">Contours traced from the uploaded photo. Vector outline paths; the JotColoring credit is an embedded logo.</desc><rect width="${width}" height="${height}" fill="white"/>${vectorDrawingPaths(result)}<image x="0" y="${f.top}" width="${f.width}" height="${f.height}" href="data:image/png;base64,${logo}"/></svg>`;}
export function wordPhoto(png:Uint8Array,width:number,height:number,title:string,metadata?:{description:string}){
 const landscape=width>height,pageW=landscape?16838:11906,pageH=landscape?11906:16838,maxW=(pageW-1440)*635,maxH=(pageH-1440-240)*635,scale=Math.min(maxW/width,maxH/height),cx=Math.floor(width*scale),cy=Math.floor(height*scale),encode=strToU8;
 const parts:Record<string,Uint8Array>={
 '[Content_Types].xml':encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/></Types>'),
 '_rels/.rels':encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'),
 'docProps/core.xml':encode(`<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}${metadata?'':' coloring page'}</dc:title><dc:creator>JotColoring</dc:creator><dc:description>${xml(metadata?.description||`Converted from the original photo using ${PHOTO_ALGORITHM}. Embedded outline image.`)}</dc:description></cp:coreProperties>`),
 'word/_rels/document.xml.rels':encode('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/coloring-page.png"/><Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/></Relationships>'),
 'word/settings.xml':encode('<?xml version="1.0" encoding="UTF-8"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:zoom w:val="fullPage" w:percent="75"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>'),
 'word/media/coloring-page.png':png,
 'word/document.xml':encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body><w:p><w:pPr><w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Coloring page" descr="${xml(title)} coloring page"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="coloring-page.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImage1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:sectPr><w:pgSz w:w="${pageW}" w:h="${pageH}"${landscape?' w:orient="landscape"':''}/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`)
 };return zipSync(parts,{level:6});
}
export async function exportPhoto(result:OutlineResult,title:string,format:PhotoFormat,status:(s:string)=>void=()=>{}){
 const choice=PHOTO_FORMATS.find(f=>f.id===format);if(!choice)throw new Error('Choose a supported file format.');status(`Preparing ${choice.label} from your original outlines…`);let blob:Blob;
 if(format==='svg')blob=new Blob([await svgPhoto(result,title)],{type:choice.mime});
 else if(format==='pdf'){const size=photoPageSize(result.width,result.height),overlayPng=new Uint8Array(await(await canvasBlob(footerOverlay(size.width,size.height),'image/png')).arrayBuffer());let bytes:Uint8Array|undefined;for(const bits of (result.gray?[8,4,2,1]:[1]) as (1|2|4|8)[]){const packed=packedDrawing(result,bits);bytes=await buildPdf([{type:'gray',width:packed.width,height:packed.height,bits,bytes:packed.bytes,overlayPng}],'a4',packed.width>packed.height?'landscape':'portrait');if(bytes.byteLength<1_000_000)break;}blob=new Blob([enforcePdfLimit(bytes!) as BlobPart],{type:choice.mime});}
 else{const page=photoPage(result);if(format==='docx'){const png=new Uint8Array(await(await canvasBlob(page,'image/png')).arrayBuffer());blob=new Blob([wordPhoto(png,page.width,page.height,title) as BlobPart],{type:choice.mime});}else if(format==='webp')blob=await(await import('./webp')).losslessWebP(page);else blob=await canvasBlob(page,choice.mime,format==='jpeg'?.98:undefined);}
 if(!blob.size||blob.size>32000000)throw new Error('This file is too large. Reduce Detail or increase smoothing and try again.');return{blob,name:photoFilename(title,choice.extension)};
}

/** Same dimensions at every PDF bit depth; optional quantization never crops the scene. */
export function packedDrawing(result:OutlineResult,bits:1|2|4|8){
 if(![1,2,4,8].includes(bits))throw new Error('Invalid print depth.');
 if(bits===1)return packedPhotoMask(result);
 if(result.gray&&result.gray.length!==result.width*result.height)throw new Error('Invalid drawing pixels.');
 const size=photoPageSize(result.width,result.height),rowBytes=Math.ceil(size.width*bits/8),bytes=new Uint8Array(rowBytes*size.height).fill(255),levels=(1<<bits)-1;
 for(let y=0;y<result.height;y++)for(let x=0;x<result.width;x++){
  const gray=result.gray?.[y*result.width+x]??(result.mask[y*result.width+x]?0:255),value=Math.round(gray/255*levels),index=y*rowBytes+Math.floor(x*bits/8),shift=8-bits-(x*bits%8);bytes[index]=(bytes[index]&~(levels<<shift))|(value<<shift);
 }return {...size,bytes};
}
/** Real vector paths in 16 neutral ink tones preserve smooth stroke edges. */
export function vectorDrawingPaths(result:OutlineResult){
 if(!result.gray)return `<path fill="black" d="${vectorOutlinePath(result.mask,result.width,result.height)}"/>`;
 const layers:string[]=[];let length=0;
 for(let tone=0;tone<15;tone++){
  const mask=Uint8Array.from(result.gray,v=>Math.round(v/17)===tone?1:0);if(!mask.some(Boolean))continue;
  const path=vectorOutlinePath(mask,result.width,result.height);length+=path.length;if(length>24_000_000)throw new Error('This drawing has too much texture for SVG. Choose PNG, or increase smoothing.');
  layers.push(`<path fill="rgb(${tone*17} ${tone*17} ${tone*17})" d="${path}"/>`);
 }return layers.join('');
}

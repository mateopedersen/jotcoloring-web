import {PDFDocument,PDFDict,PDFName,PDFRawStream,PDFArray,PDFRef} from 'pdf-lib';
import {inflateSync} from 'node:zlib';
import sharp from 'sharp';
import {BRAND_VERSION,brandLogoRGB,BRAND_LOGO_WIDTH,BRAND_LOGO_HEIGHT} from '../../src/server/branding';
import {pdfBrandBox,SUPPLIED_A4_BRAND_BOX,SUPPLIED_TOPIC_A4_BRAND_BOXES} from '../../src/server/pdf-branding';
export function isA4PageSize(size:{width:number;height:number}){
 const portrait=Math.abs(size.width-595.2756)<1&&Math.abs(size.height-841.8898)<1;
 const landscape=Math.abs(size.width-841.8898)<1&&Math.abs(size.height-595.2756)<1;
 return portrait||landscape;
}
/** Permit one inert grayscale artwork image and only the exact approved RGB logo in its footer. */
export async function reviewPrintablePDF(bytes:Uint8Array,role:string,requireBrand=true,expectedTitle?:string,sourceLogoPosition?:{x:number;y:number;width:number;height:number}){
 if(bytes.length>1_000_000)throw new Error('PDF exceeds 1,000,000 bytes.');
 const doc=await PDFDocument.load(bytes,{ignoreEncryption:false});if(doc.getPageCount()!==1)throw new Error('Printable PDF must contain exactly one page.');
 if(expectedTitle!==undefined&&doc.getTitle()!==expectedTitle)throw new Error('PDF document title differs from the reviewed artwork title.');
 const page=doc.getPage(0),size=page.getSize(),isA4=isA4PageSize(size),isLetter=Math.abs(size.width-612)<1&&Math.abs(size.height-792)<1;if(role==='printable_pdf_letter_bw'?!isLetter:!isA4)throw new Error('Incorrect PDF paper size.');
 const b=pdfBrandBox(size.width,size.height),allowedLogoBoxes=[b,...(isA4?[SUPPLIED_A4_BRAND_BOX,...SUPPLIED_TOPIC_A4_BRAND_BOXES]:[])],forbidden=['JS','JavaScript','OpenAction','AA','Launch','EmbeddedFiles','RichMedia','XFA','AcroForm','Encrypt'];if(sourceLogoPosition){const p=sourceLogoPosition;if(!isA4||p.x<0||p.y<0||p.width<=0||p.height<=0||p.x+p.width>size.width+.001||p.y+p.height>size.height+.001)throw new Error('Source logo position is outside the printable page.');allowedLogoBoxes.push(p);}let images=0,logos=0,streams=0,brands=0,artworkDraws=0;const logoRefs=new Set<string>();
 for(const [ref,object] of doc.context.enumerateIndirectObjects()){
  const dict=object instanceof PDFDict?object:object instanceof PDFRawStream?object.dict:null;
  if(dict?.has(PDFName.of('Annots'))){const annotations=doc.context.lookup(dict.get(PDFName.of('Annots')));if(!(annotations instanceof PDFArray)||annotations.size()>0)throw new Error('PDF annotations are not supported.');}
  if(dict&&forbidden.some(k=>dict.has(PDFName.of(k))))throw new Error('Active or annotated PDF rejected.');
  if(!(object instanceof PDFRawStream))continue;
  if(object.dict.get(PDFName.of('Subtype'))===PDFName.of('Image')){
   const space=object.dict.get(PDFName.of('ColorSpace'))?.toString(),filter=object.dict.get(PDFName.of('Filter'))?.toString();
   if(space==='/DeviceRGB'&&filter==='/FlateDecode'){
    const raw=inflateSync(object.getContents(),{maxOutputLength:BRAND_LOGO_WIDTH*BRAND_LOGO_HEIGHT*3}),approved=brandLogoRGB();
    if(Number(object.dict.get(PDFName.of('Width'))?.toString())!==BRAND_LOGO_WIDTH||Number(object.dict.get(PDFName.of('Height'))?.toString())!==BRAND_LOGO_HEIGHT||raw.length!==approved.length||raw.some((v,i)=>v!==approved[i]))throw new Error('PDF contains an unapproved colored image.');logos++;logoRefs.add(ref.toString());
   }else{
    images++;if(space!=='/DeviceGray'||filter!=='/DCTDecode')throw new Error('Re-export the artwork using a DeviceGray JPEG image.');const image=sharp(object.getContents(),{limitInputPixels:25_000_000}),meta=await image.metadata();if(meta.channels!==1||meta.format!=='jpeg')throw new Error('PDF artwork is not a true grayscale JPEG.');await image.raw().toBuffer();
   }
  }else{
   streams++;if(object.dict.get(PDFName.of('Filter'))?.toString()!=='/FlateDecode')throw new Error('Unsupported PDF stream.');
   let decoded=inflateSync(object.getContents(),{maxOutputLength:20000}).toString('ascii');
   const logoBlock=/q\n([^\n]+) cm\n\/(JotBrand-\d+) Do\nQ\n/g;
   decoded=decoded.replace(logoBlock,(_all,matrix,name)=>{const values=String(matrix).split(' ').map(Number),matches=allowedLogoBoxes.some(box=>{const expected=[box.width,0,0,box.height,box.x,box.y];return values.length===6&&values.every((v,i)=>Math.abs(v-expected[i])<=.001)});if(!matches)throw new Error('PDF logo is outside the approved footer position.');const resource=page.node.Resources()?.lookup(PDFName.of('XObject'),PDFDict)?.get(PDFName.of(name));if(!(resource instanceof PDFRef))throw new Error('Missing PDF logo resource.');const image=doc.context.lookup(resource);if(!(image instanceof PDFRawStream))throw new Error('Unexpected PDF image resource.');if(image.dict.get(PDFName.of('ColorSpace'))?.toString()!=='/DeviceRGB')throw new Error('Unexpected PDF logo resource.');brands++;return '';});
   const number='[-+]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)',transform=new RegExp('^(?:'+number+'\\s+){6}cm$');for(const line of decoded.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)){if(/^\/Image-[0-9]+ Do$/.test(line)){const name=line.slice(1,-3),resource=page.node.Resources()?.lookup(PDFName.of('XObject'),PDFDict)?.get(PDFName.of(name));if(!(resource instanceof PDFRef))throw new Error('Missing PDF image resource.');const image=doc.context.lookup(resource);if(!(image instanceof PDFRawStream)||image.dict.get(PDFName.of('ColorSpace'))?.toString()!=='/DeviceGray')throw new Error('Colored content is only permitted in the approved logo footer.');artworkDraws++;}else if(line!=='q'&&line!=='Q'&&!transform.test(line))throw new Error('PDF contains unreviewed operators outside the approved footer.');}
  }
 }
 const resources=page.node.Resources()?.lookup(PDFName.of('XObject'),PDFDict);if(requireBrand&&(!resources||!resources.entries().some(([name,ref])=>name.toString().startsWith('/JotBrand-')&&logoRefs.has(ref.toString()))))throw new Error('PDF footer does not reference its approved logo.');
 if(images!==1||artworkDraws!==1||streams!==1||logos!==(requireBrand?1:0)||brands!==(requireBrand?1:0))throw new Error('Only the prepared grayscale artwork and branded footer PDF layout is supported.');
 return {page_count:1,width:size.width,height:size.height,bw:true,artwork_grayscale:true,brand_version:requireBrand?BRAND_VERSION:null};
}

/** Update only document information; accepted image streams are not re-encoded. */
export async function alignPDFDocumentTitle(bytes:Uint8Array,title:string){
 const doc=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});
 if(doc.getTitle()===title)return {bytes,changed:false};
 doc.setTitle(title);const updated=await doc.save({useObjectStreams:true});
 if(updated.length>1_000_000)throw new Error('Updated PDF exceeds 1,000,000 bytes.');
 return {bytes:updated,changed:true};
}

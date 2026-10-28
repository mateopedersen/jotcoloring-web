import {PDFDocument,PDFDict,PDFName,PDFRawStream,PDFArray,StandardFonts} from 'pdf-lib';
import {inflateSync} from 'node:zlib';
import sharp from 'sharp';
import {BRAND_TEXT,BRAND_RGB,BRAND_VERSION,brandFooterLayout} from '../../src/server/branding';
/** Accept an inert grayscale image plus only the known orange footer text.
 * Arbitrary colored PDF content must be re-exported from a reviewed raster.
 */
export async function reviewPrintablePDF(bytes:Uint8Array,role:string,requireBrand=true){
 if(bytes.length>1_000_000)throw new Error('PDF exceeds 1,000,000 bytes.');
 const doc=await PDFDocument.load(bytes,{ignoreEncryption:false});if(doc.getPageCount()!==1)throw new Error('Printable PDF must contain exactly one page.');
 const page=doc.getPage(0),size=page.getSize(),expected=role==='printable_pdf_letter_bw'?[612,792]:[595.2756,841.8898];if(Math.abs(size.width-expected[0])>1||Math.abs(size.height-expected[1])>1)throw new Error('Incorrect PDF paper size.');
 const font=await doc.embedFont(StandardFonts.HelveticaBold),fontSize=size.width*.2/font.widthOfTextAtSize(BRAND_TEXT,1),footer=brandFooterLayout(Math.round(size.width),Math.round(size.height)).footer.height,brandX=size.width-size.width*.018-font.widthOfTextAtSize(BRAND_TEXT,fontSize),brandY=(footer-font.heightAtSize(fontSize,{descender:false}))/2;
 const forbidden=['JS','JavaScript','OpenAction','AA','Launch','EmbeddedFiles','RichMedia','XFA','AcroForm','Encrypt'];let images=0,streams=0,brands=0;
 for(const [,object] of doc.context.enumerateIndirectObjects()){
  const dict=object instanceof PDFDict?object:object instanceof PDFRawStream?object.dict:null;
  if(dict?.has(PDFName.of('Annots'))){const annotations=doc.context.lookup(dict.get(PDFName.of('Annots')));if(!(annotations instanceof PDFArray)||annotations.size()>0)throw new Error('PDF annotations are not supported.');}
  if(dict&&forbidden.some(k=>dict.has(PDFName.of(k))))throw new Error('Active or annotated PDF rejected.');
  if(!(object instanceof PDFRawStream))continue;
  if(object.dict.get(PDFName.of('Subtype'))===PDFName.of('Image')){
   images++;if(object.dict.get(PDFName.of('ColorSpace'))?.toString()!=='/DeviceGray'||object.dict.get(PDFName.of('Filter'))?.toString()!=='/DCTDecode')throw new Error('Re-export the artwork using a DeviceGray JPEG image.');
   const image=sharp(object.getContents(),{limitInputPixels:25_000_000}),meta=await image.metadata();if(meta.channels!==1||meta.format!=='jpeg')throw new Error('PDF artwork is not a true grayscale JPEG.');await image.raw().toBuffer();
  }else{
   streams++;if(object.dict.get(PDFName.of('Filter'))?.toString()!=='/FlateDecode')throw new Error('Unsupported PDF stream.');
   let decoded=inflateSync(object.getContents(),{maxOutputLength:20000}).toString('ascii');
   const textBlock=/q\nBT\n([^\n]+) rg\n\/(Helvetica-Bold-\d+) ([^\n]+) Tf\n[^\n]+ TL\n1 0 0 1 ([^ ]+) ([^\n]+) Tm\n<4A6F74436F6C6F72696E6799> Tj\nT\*\nET\nQ\n/g;
   decoded=decoded.replace(textBlock,(_all,colors,fontName,fs,x,y)=>{const rgb=String(colors).split(' ').map(Number);if(rgb.length!==3||rgb.some((v,i)=>Math.abs(v-BRAND_RGB[i]/255)>1e-8)||Math.abs(Number(fs)-fontSize)>.001||Math.abs(Number(x)-brandX)>.001||Math.abs(Number(y)-brandY)>.001)throw new Error('PDF brand is outside the approved footer or has unexpected color.');const resources=page.node.Resources(),fonts=resources?.lookup(PDFName.of('Font'),PDFDict),used=fonts?.lookup(PDFName.of(fontName),PDFDict);if(used?.get(PDFName.of('BaseFont'))?.toString()!=='/Helvetica-Bold')throw new Error('Unexpected PDF footer font.');brands++;return '';});
   const number='[-+]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)',transform=new RegExp('^(?:'+number+'\\s+){6}cm$');
   if(decoded.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).some(line=>line!=='q'&&line!=='Q'&&!transform.test(line)&&!/^\/Image-[0-9]+ Do$/.test(line)))throw new Error('PDF contains unreviewed operators outside the approved footer.');
  }
 }
 if(images!==1||streams!==1||brands!==(requireBrand?1:0))throw new Error('Only the prepared grayscale artwork and branded footer PDF layout is supported.');
 return {page_count:1,width:size.width,height:size.height,bw:true,artwork_grayscale:true,brand_version:requireBrand?BRAND_VERSION:null};
}

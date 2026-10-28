import {StandardFonts,rgb,pushGraphicsState,popGraphicsState,concatTransformationMatrix,drawObject,type PDFDocument,type PDFPage} from 'pdf-lib';
import {BRAND_TEXT,BRAND_RGB,BRAND_VERSION,brandFooterLayout} from './branding';
export async function drawPDFBrandFooter(doc:PDFDocument,page:PDFPage){const {width,height}=page.getSize(),layout=brandFooterLayout(Math.round(width),Math.round(height)),font=await doc.embedFont(StandardFonts.HelveticaBold),fontSize=width*.2/font.widthOfTextAtSize(BRAND_TEXT,1),x=width-width*.018-font.widthOfTextAtSize(BRAND_TEXT,fontSize),y=(layout.footer.height-font.heightAtSize(fontSize,{descender:false}))/2;page.drawText(BRAND_TEXT,{x,y,size:fontSize,font,color:rgb(...BRAND_RGB.map(x=>x/255) as [number,number,number])});doc.setKeywords(['JotColoring',BRAND_VERSION,'grayscale artwork','orange brand footer','personal and educational use; commercial use requires permission']);return {footerHeight:layout.footer.height};}
export function pdfArtworkBox(width:number,height:number){const footer=brandFooterLayout(Math.round(width),Math.round(height)).footer.height;return {x:20,y:footer+20,width:width-40,height:height-footer-40};}
/** An actual one-channel image prevents RGB JPEG chroma artifacts in blank art. */
export function drawGrayscalePDFArtwork(doc:PDFDocument,page:PDFPage,gray:Uint8Array,width:number,height:number){
 if(gray.length!==width*height)throw new Error('Expected one grayscale byte per artwork pixel.');
 const stream=doc.context.flateStream(gray,{Type:'XObject',Subtype:'Image',Width:width,Height:height,ColorSpace:'DeviceGray',BitsPerComponent:8});
 const ref=doc.context.register(stream),name=page.node.newXObject('Artwork',ref),box=pdfArtworkBox(page.getWidth(),page.getHeight());
 const scale=Math.min(box.width/width,box.height/height),w=width*scale,h=height*scale;
 page.pushOperators(pushGraphicsState(),concatTransformationMatrix(w,0,0,h,box.x+(box.width-w)/2,box.y+(box.height-h)/2),drawObject(name),popGraphicsState());
}

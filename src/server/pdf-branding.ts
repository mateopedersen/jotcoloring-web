import {pushGraphicsState,popGraphicsState,concatTransformationMatrix,drawObject,type PDFDocument,type PDFPage} from 'pdf-lib';
import {BRAND_VERSION,brandFooterLayout,brandLogoRGB,BRAND_LOGO_WIDTH,BRAND_LOGO_HEIGHT} from './branding';
export function pdfBrandBox(width:number,height:number){const layout=brandFooterLayout(Math.round(width),Math.round(height));return {x:layout.brand.x,y:height-layout.brand.y-layout.brand.height,width:layout.brand.width,height:layout.brand.height,footerHeight:layout.footer.height};}
export async function drawPDFBrandFooter(doc:PDFDocument,page:PDFPage){const {width,height}=page.getSize(),b=pdfBrandBox(width,height),stream=doc.context.flateStream(brandLogoRGB(),{Type:'XObject',Subtype:'Image',Width:BRAND_LOGO_WIDTH,Height:BRAND_LOGO_HEIGHT,ColorSpace:'DeviceRGB',BitsPerComponent:8}),ref=doc.context.register(stream),name=page.node.newXObject('JotBrand',ref);page.pushOperators(pushGraphicsState(),concatTransformationMatrix(b.width,0,0,b.height,b.x,b.y),drawObject(name),popGraphicsState());doc.setKeywords(['JotColoring',BRAND_VERSION,'grayscale artwork','approved 3D logo footer','personal and educational use; commercial use requires permission']);return {footerHeight:b.footerHeight};}
export function pdfArtworkBox(width:number,height:number){const footer=brandFooterLayout(Math.round(width),Math.round(height)).footer.height;return {x:20,y:footer+20,width:width-40,height:height-footer-40};}
/** An actual one-channel image prevents RGB JPEG chroma artifacts in blank art. */
export function drawGrayscalePDFArtwork(doc:PDFDocument,page:PDFPage,gray:Uint8Array,width:number,height:number){
 if(gray.length!==width*height)throw new Error('Expected one grayscale byte per artwork pixel.');
 const stream=doc.context.flateStream(gray,{Type:'XObject',Subtype:'Image',Width:width,Height:height,ColorSpace:'DeviceGray',BitsPerComponent:8});
 const ref=doc.context.register(stream),name=page.node.newXObject('Artwork',ref),box=pdfArtworkBox(page.getWidth(),page.getHeight());
 const scale=Math.min(box.width/width,box.height/height),w=width*scale,h=height*scale;
 page.pushOperators(pushGraphicsState(),concatTransformationMatrix(w,0,0,h,box.x+(box.width-w)/2,box.y+(box.height-h)/2),drawObject(name),popGraphicsState());
}

import { pageDimensions } from './model';
export const MAX_PDF_BYTES=1_000_000;
export type PdfImage = { bytes: Uint8Array; type:'png'|'jpeg' } | {bytes:Uint8Array;type:'gray';width:number;height:number;bits:1|2|4|8;overlayPng?:Uint8Array};
export async function buildPdf(images:PdfImage[],paper:string,orientation:string){
  const {PDFDocument,pushGraphicsState,concatTransformationMatrix,drawObject,popGraphicsState}=await import('pdf-lib');const doc=await PDFDocument.create();doc.setTitle('My JotColoring artwork');doc.setCreator('JotColoring');
  const [w,h]=pageDimensions(paper,orientation);for(const image of images){const page=doc.addPage([w,h]);if(image.type==='gray'){
      const rowBytes=Math.ceil(image.width*image.bits/8);if(image.bytes.length!==rowBytes*image.height)throw new Error('Invalid outline pixel data.');
      const {zlibSync}=await import('fflate');const stream=doc.context.stream(zlibSync(image.bytes,{level:9}),{Type:'XObject',Subtype:'Image',Width:image.width,Height:image.height,ColorSpace:'DeviceGray',BitsPerComponent:image.bits,Filter:'FlateDecode'});const reference=doc.context.register(stream);const name=page.node.newXObject('Outline',reference);const scale=Math.min((w-36)/image.width,(h-36)/image.height),iw=image.width*scale,ih=image.height*scale;page.pushOperators(pushGraphicsState(),concatTransformationMatrix(iw,0,0,ih,(w-iw)/2,(h-ih)/2),drawObject(name),popGraphicsState());if(image.overlayPng){const overlay=await doc.embedPng(image.overlayPng);page.drawImage(overlay,{x:(w-iw)/2,y:(h-ih)/2,width:iw,height:ih});}
    }else{const embedded=image.type==='png'?await doc.embedPng(image.bytes):await doc.embedJpg(image.bytes);const scale=Math.min((w-36)/embedded.width,(h-36)/embedded.height);const iw=embedded.width*scale,ih=embedded.height*scale;page.drawImage(embedded,{x:(w-iw)/2,y:(h-ih)/2,width:iw,height:ih});}}
  return doc.save({useObjectStreams:true});
}
export function enforcePdfLimit(bytes:Uint8Array){if(bytes.byteLength>MAX_PDF_BYTES)throw new Error('The PDF exceeds the 1 MB limit. No oversized file was downloaded.');return bytes;}

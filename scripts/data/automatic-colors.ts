import sharp from 'sharp';
import {automaticColorPixels,type ColorContext} from '../../src/coloring/automatic';
/** Local CPU preparation; output is unbranded because the shared raster helper
 * adds the exact same footer/fit as the matching blank derivative afterwards. */
export async function automaticColorPNG(input:Uint8Array,context:ColorContext){
 const {data,info}=await sharp(input,{limitInputPixels:25_000_000}).rotate().flatten({background:'#fff'}).resize({width:900,height:1400,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {pixels,...report}=automaticColorPixels(data,info.width,info.height,context);
 if(!report.coloredRegions)throw new Error('No enclosed coloring spaces were found. Repair the outline before preparing a color inspiration.');
 const png=await sharp(pixels,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
 return{png,report:{...report,width:info.width,height:info.height}};
}

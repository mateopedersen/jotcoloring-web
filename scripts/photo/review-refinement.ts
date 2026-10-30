import {readFile,mkdir,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {finishDrawing} from '../../src/photo/drawing';
import {refineDrawingMap} from '../../src/photo/refine';
import {DEFAULT_SETTINGS,outlineRGBA} from '../../src/photo/outline';
const directory='.local/photo-v5';await mkdir(directory,{recursive:true});const report=[];
for(const name of ['private','portrait','cat','coffee','rocket','grayscale','dark-portrait','rotated-portrait']){
 const meta=JSON.parse(await readFile(`.local/photo-v3/${name}-drawing.json`,'utf8')),bytes=await readFile(`.local/photo-v3/${name}-drawing.bin`),gray=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),source=name==='private'?'.local/photo-v3/private-portrait.jpg':`.local/photo-v2/samples/${name}.png`,{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),rgba=new Uint8ClampedArray(data);
 const before=finishDrawing({...meta,gray},info.width,info.height,DEFAULT_SETTINGS,rgba),t=performance.now(),map=refineDrawingMap({...meta,gray},rgba,info.width,info.height,DEFAULT_SETTINGS),after=finishDrawing(map,info.width,info.height,DEFAULT_SETTINGS,rgba);report.push({name,before:{regions:before.regions,ink:before.inkPixels},after:{regions:after.regions,ink:after.inkPixels},milliseconds:performance.now()-t});
 await sharp(outlineRGBA(after),{raw:{width:after.width,height:after.height,channels:4}}).png().toFile(`${directory}/${name}-after.png`);
 const inputs=[await sharp(source).resize(400,400,{fit:'contain',background:'#fff'}).png().toBuffer(),await sharp(outlineRGBA(before),{raw:{width:before.width,height:before.height,channels:4}}).resize(400,400,{fit:'contain',background:'#fff'}).png().toBuffer(),await sharp(outlineRGBA(after),{raw:{width:after.width,height:after.height,channels:4}}).resize(400,400,{fit:'contain',background:'#fff'}).png().toBuffer()];
 await sharp({create:{width:1200,height:432,channels:3,background:'#fff'}}).composite([...inputs.map((input,i)=>({input,left:i*400,top:32})),{input:Buffer.from('<svg width="1200" height="30"><g font-family="Arial" font-size="16"><text x="10" y="22">Original</text><text x="410" y="22">Previous processor</text><text x="810" y="22">Refined contours</text></g></svg>'),left:0,top:0}]).png().toFile(`${directory}/${name}-comparison.png`);
}
await writeFile(`${directory}/report.json`,JSON.stringify(report,null,2));console.log(report);

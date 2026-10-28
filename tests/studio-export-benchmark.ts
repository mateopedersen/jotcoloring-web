// Optional real-asset check: node --import tsx tests/studio-export-benchmark.ts path/to/outline.png
import {createCanvas,loadImage,Path2D,ImageData} from '@napi-rs/canvas';
import {readFile} from 'node:fs/promises';
import {createProject} from '../src/studio/model';
import {lineMask,compose,outlineCanvas} from '../src/studio/render';
import {exportArtwork} from '../src/studio/export';
import {floodRegion} from '../src/studio/flood-fill';
Object.assign(globalThis,{Path2D,ImageData,document:{createElement:()=>createCanvas(1,1)}});
const source=process.argv[2];if(!source)throw new Error('Pass an actual source image path.');
const raw=await readFile(source),img=await loadImage(raw);
const p=createProject({id:'benchmark',title:'Export benchmark',revision:'qa',url:'local',width:img.width,height:img.height,blob:new Blob([raw])});
const mask=lineMask(img as any,img.width,img.height),pixels=mask.getContext('2d')!.getImageData(0,0,img.width,img.height).data;
for(const [x,y,color]of [[.49,.33,'#f9b44c'],[.73,.59,'#eea4bc'],[.2,.26,'#88c969']]as const)p.layers[0].operations.push({kind:'fill',spans:floodRegion(pixels,img.width,img.height,Math.floor(x*img.width),Math.floor(y*img.height),100,false),color,opacity:1});
p.texts.push({id:'qa-text',text:'My woodland',x:100,y:img.height-136,size:40,scale:1,rotation:0,align:'left',color:'#227255',visible:true});
const art=compose(p,mask),outline=outlineCanvas(p,mask),results=[];
for(const paper of ['a4','letter'])for(const orientation of ['portrait','landscape'])for(const includeOutline of [false,true]){
  try{const output=await exportArtwork(art,outline,{format:'pdf',outline:includeOutline,paper,orientation,filename:'painted'},()=>{});results.push({paper,orientation,pages:includeOutline?2:1,bytes:output.blob.size,width:output.width,height:output.height});}
  catch(error){results.push({paper,orientation,pages:includeOutline?2:1,error:error instanceof Error?error.message:'failed'});process.exitCode=1;}
}
const webp=await exportArtwork(art,outline,{format:'webp',outline:false,paper:'a4',orientation:'portrait',filename:'painted'},()=>{});
results.push({format:'webp',bytes:webp.blob.size,width:webp.width,height:webp.height});console.log(JSON.stringify({source,results},null,2));

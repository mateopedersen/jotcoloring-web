/** Local CPU inference. Only model files are downloaded; artwork is never uploaded. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {pipeline,RawImage,env,type ZeroShotImageClassificationPipeline} from '@huggingface/transformers';
import {AGE_VERSION,VISION_MODEL,VISION_REVISION,DETAIL_LABELS,SUBJECT_LABELS,analyzeDetailPixels,recommendAge,validAgeAssessment,type AgeAssessment} from '../../src/age/model';
const cache=path.resolve('.local/age-vision');env.cacheDir=path.join(cache,'models');env.useBrowserCache=false;
let classifier:Promise<ZeroShotImageClassificationPipeline>|undefined;
function vision():Promise<ZeroShotImageClassificationPipeline>{if(!classifier)classifier=pipeline<'zero-shot-image-classification'>('zero-shot-image-classification',VISION_MODEL,{revision:VISION_REVISION,dtype:'q8',device:'cpu',cache_dir:env.cacheDir});return classifier;}
export async function releaseAgeModel(){if(classifier){const current=classifier;classifier=undefined;await(await current).dispose();}}
export async function analyzeAgeImage(bytes:Uint8Array,options:{brandFooter?:boolean}={}):Promise<AgeAssessment>{
 const sha=createHash('sha256').update(bytes).digest('hex'),cacheFile=path.join(cache,'assessments',`${AGE_VERSION}-${sha}.json`);
 try{const result=JSON.parse(await fs.readFile(cacheFile,'utf8'));if(validAgeAssessment(result,sha))return result;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'&&error instanceof SyntaxError)throw new Error('The age-analysis cache is corrupt. Remove its record and retry.');}
 const image=sharp(bytes,{limitInputPixels:25000000}).rotate().flatten({background:'#fff'}),meta=await image.metadata();if(!meta.width||!meta.height||meta.width<64||meta.height<64)throw new Error('The image is too small for age analysis.');
 const content=options.brandFooter?image.extract({left:0,top:0,width:meta.width,height:Math.floor(meta.height*.935)}):image;
 const {data,info}=await content.resize({width:768,height:768,fit:'inside',withoutEnlargement:true}).toColourspace('srgb').removeAlpha().raw().toBuffer({resolveWithObject:true});
 const metrics=analyzeDetailPixels(new Uint8Array(data),info.width,info.height),model=await vision(),raw=new RawImage(new Uint8ClampedArray(data),info.width,info.height,3);
 const detail=await model(raw,[...DETAIL_LABELS],{hypothesis_template:'{}'}) as Array<{label:string;score:number}>,subjects=await model(raw,[...SUBJECT_LABELS].map(s=>`a black and white coloring page showing ${s}`),{hypothesis_template:'{}'}) as Array<{label:string;score:number}>;
 const visual_scores=DETAIL_LABELS.map(label=>detail.find(r=>r.label===label)?.score??NaN),decision=recommendAge(metrics,visual_scores);
 const result:AgeAssessment={version:AGE_VERSION,source_sha256:sha,model:VISION_MODEL,model_revision:VISION_REVISION,...decision,metrics,visual_scores,subjects:subjects.slice(0,3).map(s=>({label:s.label.replace('a black and white coloring page showing ',''),score:s.score})),analyzed_at:new Date().toISOString()};
 if(!validAgeAssessment(result,sha))throw new Error('Visual analysis did not produce a valid age recommendation.');await fs.mkdir(path.dirname(cacheFile),{recursive:true});await fs.writeFile(cacheFile,JSON.stringify(result),{mode:0o600});return result;
}

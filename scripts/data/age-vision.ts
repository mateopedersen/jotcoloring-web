/** Local CPU inference. Only model files are downloaded; artwork is never uploaded. */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {prepareAnalysisImage} from './analysis-input';
import {classifyCategories,CATEGORY_ENGINE_VERSION} from '../../src/taxonomy/analysis';
import {pipeline,RawImage,env,type ZeroShotImageClassificationPipeline} from '@huggingface/transformers';
import {AGE_VERSION,VISION_MODEL,VISION_REVISION,DETAIL_LABELS,SUBJECT_LABELS,analyzeDetailPixels,recommendAge,validAgeAssessment,type AgeAssessment} from '../../src/age/model';
const cache=path.resolve('.local/age-vision');env.cacheDir=path.join(cache,'models');env.useBrowserCache=false;
let classifier:Promise<ZeroShotImageClassificationPipeline>|undefined;
function vision():Promise<ZeroShotImageClassificationPipeline>{if(!classifier)classifier=pipeline<'zero-shot-image-classification'>('zero-shot-image-classification',VISION_MODEL,{revision:VISION_REVISION,dtype:'q8',device:'cpu',cache_dir:env.cacheDir});return classifier;}
export async function releaseAgeModel(){if(classifier){const current=classifier;classifier=undefined;await(await current).dispose();}}
export const ageAssessmentFile=(sha:string,brandFooter=true)=>path.join(cache,'assessments',`${AGE_VERSION}-${CATEGORY_ENGINE_VERSION}-${sha}-${brandFooter?'branded':'plain'}.json`);
export async function analyzeAgeImage(bytes:Uint8Array,options:{brandFooter?:boolean}={}):Promise<AgeAssessment>{
 const sha=createHash('sha256').update(bytes).digest('hex'),inputMode=options.brandFooter?'branded':'plain',cacheFile=ageAssessmentFile(sha,!!options.brandFooter);
 try{const result=JSON.parse(await fs.readFile(cacheFile,'utf8'));if(validAgeAssessment(result,sha)&&result.input_mode===inputMode)return result;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT'&&error instanceof SyntaxError)throw new Error('The age-analysis cache is corrupt. Remove its record and retry.');}
 const input=await prepareAnalysisImage(bytes,!!options.brandFooter);
 const metrics=analyzeDetailPixels(input.rgb,input.width,input.height),model=await vision(),raw=new RawImage(input.vision,224,224,3);
 const detail=await model(raw,[...DETAIL_LABELS],{hypothesis_template:'{}'}) as Array<{label:string;score:number}>,subjects=await model(raw,[...SUBJECT_LABELS].map(s=>`a black and white coloring page showing ${s}`),{hypothesis_template:'{}'}) as Array<{label:string;score:number}>;
 const visual_scores=DETAIL_LABELS.map(label=>detail.find(r=>r.label===label)?.score??NaN),decision=recommendAge(metrics,visual_scores);
 const views=[raw];for(const factor of [.8,.55]){const width=Math.floor(input.width*factor),height=Math.floor(input.height*factor),pixels=await sharp(input.rgb,{raw:{width:input.width,height:input.height,channels:3}}).extract({left:Math.floor((input.width-width)/2),top:Math.floor((input.height-height)/2),width,height}).resize(224,224,{fit:'contain',background:'#fff'}).raw().toBuffer();views.push(new RawImage(new Uint8ClampedArray(pixels),224,224,3));}
 const category_analysis=await classifyCategories(async(labels,template,view)=>{const predicted=await model(views[view],labels,{hypothesis_template:template}) as Array<{label:string;score:number}>;return labels.map(label=>predicted.find(p=>p.label===label)?.score??NaN);},{regions:metrics.regions,inkRatio:metrics.inkRatio,edgeDensity:metrics.edgeDensity});
 const result:AgeAssessment={input_mode:inputMode,category_analysis,version:AGE_VERSION,source_sha256:sha,model:VISION_MODEL,model_revision:VISION_REVISION,...decision,metrics,visual_scores,subjects:subjects.slice(0,3).map(s=>({label:s.label.replace('a black and white coloring page showing ',''),score:s.score})),analyzed_at:new Date().toISOString()};
 if(!validAgeAssessment(result,sha))throw new Error('Visual analysis did not produce a valid age recommendation.');await fs.mkdir(path.dirname(cacheFile),{recursive:true});const pending=cacheFile+'.'+crypto.randomUUID()+'.tmp';try{await fs.writeFile(pending,JSON.stringify(result),{mode:0o600});await fs.rename(pending,cacheFile);}finally{await fs.rm(pending,{force:true});}return result;
}

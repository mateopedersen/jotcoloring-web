import type {RawImage,ZeroShotImageClassificationPipeline} from '@huggingface/transformers';

/** Reuse CLIP's image-independent text embeddings without changing its model. */
export function cachedCLIPClassification(pipeline:ZeroShotImageClassificationPipeline,featureLabels:readonly string[]){
 type Group={embeddings:Float32Array;width:number;scale:number};
 const groups=new Map<string,Group>(),images=new WeakMap<RawImage,Float32Array>();
 const p=pipeline as any;
 const probability=(logits:number[])=>{const max=Math.max(...logits),exp=logits.map(v=>Math.exp(v-max)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(v=>v/sum);};
 const dot=(image:Float32Array,text:Float32Array,offset:number,width:number)=>{let result=0;for(let j=0;j<width;j++)result+=image[j]*text[offset+j];return result;};
 async function direct(image:RawImage,labels:readonly string[]){
  const text=p.tokenizer(labels,{padding:true,truncation:true});
  const {pixel_values}=await p.processor([image]);
  return p.model({...text,pixel_values});
 }
 return async(image:RawImage,labels:readonly string[])=>{
  const key=JSON.stringify(labels);let group=groups.get(key),embedding=images.get(image);
  if(!group){
   const output=await direct(image,labels),imageData=new Float32Array(output.image_embeds.data),textData=new Float32Array(output.text_embeds.data),width=output.text_embeds.dims[1];
   const original=Array.from(output.logits_per_image.data) as number[];
   const products=labels.map((_,i)=>dot(imageData,textData,i*width,width));
   const index=products.reduce((best,v,i)=>Math.abs(v)>Math.abs(products[best])?i:best,0),scale=original[index]/products[index];
   if(!Number.isFinite(scale)||scale<=0||products.some((v,i)=>Math.abs(v*scale-original[i])>0.0002))throw Error('CLIP embedding equivalence check failed');
   group={embeddings:textData,width,scale};groups.set(key,group);embedding=imageData;images.set(image,embedding);
   const scores=probability(original);return labels.map((label,i)=>({label,score:scores[i]})).sort((a,b)=>b.score-a.score);
  }
  if(!embedding){const output=await direct(image,featureLabels);embedding=new Float32Array(output.image_embeds.data);images.set(image,embedding);}
  const logits=labels.map((_,i)=>dot(embedding!,group!.embeddings,i*group!.width,group!.width)*group!.scale),scores=probability(logits);
  return labels.map((label,i)=>({label,score:scores[i]})).sort((a,b)=>b.score-a.score);
 };
}

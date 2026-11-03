/** Prepare the existing MIT-licensed drawing network for browser GPU inference.
 * Fixed-shape constant folding removes shape-only operators unsupported by
 * WebGL. Round initializer mantissas to eight bits, then gzip the ordinary
 * float32 ONNX transport. No training or network access. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import vm from 'node:vm';import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
const hash=b=>createHash('sha256').update(b).digest('hex'),source=fs.readFileSync('public/models/photo/informative-drawing-544fb9a4.onnx');
if(hash(source)!=='544fb9a41348734fb3c83dd1decf7548b981c4127b986b151ea2ec79c63ed988')throw Error('Unreviewed source');
const runtime=fs.realpathSync(fileURLToPath(import.meta.resolve('onnxruntime-web/webgl'))),file=path.resolve(path.dirname(runtime),'../lib/onnxjs/ort-schema/protobuf/onnx.js'),module={exports:{}};
vm.runInNewContext(fs.readFileSync(file,'utf8'),{module,exports:module.exports,require:createRequire(file)});const {onnx}=module.exports;
const model=onnx.ModelProto.decode(source),grid=512;
for(const value of [...model.graph.input,...model.graph.output])for(const index of [2,3]){const dim=value.type.tensorType.shape.dim[index];delete dim.dimParam;dim.dimValue=grid;}
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'jot-drawing-opt-'));
try{
 const fixed=path.join(folder,'fixed.onnx'),optimized=path.join(folder,'optimized.onnx');fs.writeFileSync(fixed,onnx.ModelProto.encode(model).finish());
 const transformers=fs.realpathSync(fileURLToPath(import.meta.resolve('@huggingface/transformers'))),ort=createRequire(transformers)('onnxruntime-node');
 const session=await ort.InferenceSession.create(fixed,{executionProviders:['cpu'],graphOptimizationLevel:'basic',optimizedModelFilePath:optimized,intraOpNumThreads:2});await session.release();
 const packed=onnx.ModelProto.decode(fs.readFileSync(optimized));let weights=0;
 if(packed.graph.node.some(n=>n.opType==='ConstantOfShape'))throw Error('Shape operations were not folded');
 for(const tensor of packed.graph.initializer)if(tensor.dataType===1&&tensor.rawData?.length){
  const raw=Buffer.from(tensor.rawData);
  for(let i=0;i<raw.length;i+=4){const v=raw.readFloatLE(i);if(!Number.isFinite(v))throw Error('Invalid weights');const bits=raw.readUInt32LE(i);raw.writeUInt32LE(((bits+0x4000)&0xffff8000)>>>0,i);weights++;}
  tensor.rawData=raw;
 }
 // WebGL's InstanceNormalization emits one long fragment-shader loop per
 // channel. Browser drivers may truncate that loop on ordinary square photos.
 // Use exact two-pass variance with hierarchical 8x8 averages instead. Every
 // spatial stage in this fixed graph is divisible by eight; no crop or padding.
 const initializers=new Map(packed.graph.initializer.map(t=>[t.name,t])),nodes=[];let norms=0;
 const ints=(name,values)=>({name,type:7,ints:values}),tensor=(name,dims,data)=>({name,dims,dataType:1,rawData:data});
 for(const node of packed.graph.node){
  if(node.opType==='Conv'){
   const weight=initializers.get(node.input[1]);
   if(Number(weight?.dims[0])===1&&Number(weight.dims[1])===64&&Number(weight.dims[2])===7){
    // Avoid the backend's oversized im2col and one-output-channel convolution.
    // Sum the same 64 independent channel contributions, then add its bias.
    const id='jot_final',weights=id+'_weights';packed.graph.initializer.push(tensor(weights,[64,1,7,7],weight.rawData));
    nodes.push({name:id+'_depthwise',opType:'Conv',input:[node.input[0],weights],output:[id+'_channels'],attribute:[...node.attribute.filter(a=>a.name!=='group'),{name:'group',type:2,i:64}]});
    nodes.push({name:id+'_sum',opType:'ReduceSum',input:[id+'_channels'],output:[id+'_sum'],attribute:[ints('axes',[1]),{name:'keepdims',type:2,i:1}]});
    nodes.push({name:id+'_bias',opType:'Add',input:[id+'_sum',node.input[2]],output:node.output});continue;
   }
  }
  if(node.opType!=='InstanceNormalization'){nodes.push(node);continue;}
  const id=`jot_norm_${norms++}`,x=node.input[0],scale=initializers.get(node.input[1]),bias=initializers.get(node.input[2]),channels=Number(scale.dims[0]);
  if(!scale?.rawData?.length||!bias?.rawData?.length)throw Error('Missing normalization weights');
  packed.graph.initializer.push(tensor(id+'_scale',[1,channels,1,1],scale.rawData),tensor(id+'_bias',[1,channels,1,1],bias.rawData));
  const epsilon=node.attribute?.find(a=>a.name==='epsilon')?.f??1e-5,b=Buffer.alloc(4);b.writeFloatLE(epsilon);packed.graph.initializer.push(tensor(id+'_epsilon',[1],b));
  const add=(op,input,out,attribute=[])=>nodes.push({name:id+'_'+out,opType:op,input,output:[id+'_'+out],attribute});
  const pool=(input,out)=>add('AveragePool',[input],out,[ints('kernel_shape',[8,8]),ints('strides',[8,8])]);
  pool(x,'mean_blocks');add('GlobalAveragePool',[id+'_mean_blocks'],'mean');
  add('Sub',[x,id+'_mean'],'centered');add('Mul',[id+'_centered',id+'_centered'],'square');
  pool(id+'_square','variance_blocks');add('GlobalAveragePool',[id+'_variance_blocks'],'variance');
  add('Add',[id+'_variance',id+'_epsilon'],'stable');add('Sqrt',[id+'_stable'],'deviation');add('Div',[id+'_centered',id+'_deviation'],'normalized');add('Mul',[id+'_normalized',id+'_scale'],'scaled');
  nodes.push({name:id+'_result',opType:'Add',input:[id+'_scaled',id+'_bias'],output:node.output});
 }
 packed.graph.node=nodes;
 for(const op of packed.opsetImport)if(!op.domain||op.domain==='ai.onnx')op.version=12;
 const bytes=Buffer.from(onnx.ModelProto.encode(packed).finish()),transport=gzipSync(bytes,{level:9}),sha=hash(transport),name=`drawing-webgl-${sha.slice(0,8)}.bin`;
 fs.writeFileSync('public/models/photo/'+name,transport);
 const receipt={grid,file:name,bytes:transport.length,transportSHA256:sha,decodedBytes:bytes.length,decodedSHA256:hash(bytes),sourceSHA256:hash(source),weightsRounded:weights,hierarchicalNormalizations:norms,mantissaBits:8,operators:[...new Set(packed.graph.node.map(n=>n.opType))]};
 fs.writeFileSync('public/models/photo/drawing-webgl.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
}finally{fs.rmSync(folder,{recursive:true,force:true});}

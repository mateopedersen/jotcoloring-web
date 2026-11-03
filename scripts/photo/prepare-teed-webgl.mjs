/** Translate two constant-axis operators to ONNX opset 12 for ORT WebGL.
 * No training, downloads or weight changes. Source: the existing licensed TEED
 * export. Keep the original opset-17 file for CPU equivalence verification. */
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
import {fileURLToPath} from 'node:url';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const source='public/models/photo/teed-biped-7-9f7e3406.onnx',bytes=fs.readFileSync(source);
if(sha(bytes)!=='9f7e3406f561ddd5d25fea1f09c36cb4a4bf4efcbe983a3ed3548788445e8c05')throw Error('Unreviewed TEED source');
const runtime=fs.realpathSync(fileURLToPath(import.meta.resolve('onnxruntime-web/webgl')));
const protobuf=path.resolve(path.dirname(runtime),'../lib/onnxjs/ort-schema/protobuf/onnx.js'),module={exports:{}};
vm.runInNewContext(fs.readFileSync(protobuf,'utf8'),{module,exports:module.exports,require:createRequire(protobuf)});
const {onnx}=module.exports,model=onnx.ModelProto.decode(bytes),graph=model.graph;
const tensors=new Map(graph.initializer.map(t=>[t.name,t]));
for(const node of graph.node)if(node.opType==='Constant'){
 const tensor=node.attribute.find(a=>a.name==='value')?.t;if(tensor)tensors.set(node.output[0],tensor);
}
const weights=graph.initializer.map(t=>sha(onnx.TensorProto.encode(t).finish()));let translated=0;
for(const node of graph.node)if(['ReduceSum','Unsqueeze'].includes(node.opType)){
 const tensor=tensors.get(node.input[1]);if(!tensor||tensor.dataType!==7)throw Error('Expected constant int64 axes');
 const axes=tensor.rawData?.length?Array.from({length:tensor.rawData.length/8},(_,i)=>Number(Buffer.from(tensor.rawData).readBigInt64LE(i*8))):tensor.int64Data.map(Number);
 if(!axes.length)throw Error('Empty axes not supported');
 node.input=[node.input[0]];node.attribute.push(onnx.AttributeProto.fromObject({name:'axes',type:7,ints:axes}));translated++;
}
if(translated!==2||model.opsetImport.length!==1||Number(model.opsetImport[0].version)!==17)throw Error('Unexpected source graph');
model.opsetImport[0].version=12;
// ORT WebGL requires concrete input dimensions. The application pads on the
// right/bottom to this grid, then discards padding; it never stretches a photo.
for(const value of [...graph.input,...graph.output]){
 const dims=value.type.tensorType.shape.dim;
 for(const index of [2,3]){delete dims[index].dimParam;dims[index].dimValue=512;}
}
if(graph.initializer.some((t,i)=>sha(onnx.TensorProto.encode(t).finish())!==weights[i]))throw Error('Weights changed');
const output=Buffer.from(onnx.ModelProto.encode(model).finish()),hash=sha(output),file=`public/models/photo/teed-webgl-${hash.slice(0,8)}.onnx`;
if(fs.existsSync(file)&&!fs.readFileSync(file).equals(output))throw Error('Output already differs');
fs.writeFileSync(file,output);console.log(JSON.stringify({file,bytes:output.length,sha256:hash,translated,weightsUnchanged:true},null,2));

import fs from 'node:fs';
import http from 'node:http';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {unzipSync} from 'fflate';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('tsx/package.json'))('esbuild');
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const compiled=await build({entryPoints:['src/studio/export.ts'],bundle:true,format:'iife',globalName:'JotExport',write:false,platform:'browser'});
const codec=fs.readFileSync('public/codecs/photon-0.4.0.wasm'),script=compiled.outputFiles[0].text,results=[];
// Serve only this test and the already committed codec; never expose the checkout.
const server=http.createServer((req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><script src="/exports.js"></script>');}
 else if(path==='/exports.js'){res.setHeader('Content-Type','text/javascript');res.end(script);}
 else if(path==='/codecs/photon-0.4.0.wasm'){res.setHeader('Content-Type','application/wasm');res.end(codec);}
 else{res.writeHead(404);res.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
try{
 for(const [engine,type,executable]of [['chromium',chromium,process.env.JOT_CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.JOT_WEBKIT_EXECUTABLE]]){
  const browser=await type.launch({headless:true,...(executable?{executablePath:executable}:{})});
  try{
   const page=await browser.newPage(),errors=[],codecRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/codecs/'))codecRequests.push(r.url());});
   await page.goto('http://127.0.0.1:'+server.address().port);
   const result=await page.evaluate(async()=>{
    const art=document.createElement('canvas');art.width=64;art.height=96;const ctx=art.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,64,96);ctx.fillStyle='#f55b18';ctx.fillRect(4,4,24,28);ctx.fillStyle='#2487d2';ctx.fillRect(32,4,28,28);ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.strokeRect(4,38,56,54);
    const outline=document.createElement('canvas');outline.width=64;outline.height=96;outline.getContext('2d').drawImage(art,0,0);
    const native=await new Promise(resolve=>art.toBlob(b=>resolve(b?.type),'image/webp'));
    const output=await window.JotExport.exportAllArtwork(art,outline,'Browser export check',()=>{});
    return{nativeWebP:native==='image/webp',name:output.name,bytes:Array.from(new Uint8Array(await output.blob.arrayBuffer()))};
   });
   const files=unzipSync(new Uint8Array(result.bytes)),formats=[];assert.equal(Object.keys(files).length,7);
   for(const ext of ['png','svg','jpg','jpeg','docx','pdf','webp']){
    const name=Object.keys(files).find(n=>n.endsWith('.'+ext));assert.ok(name,'Missing '+ext);const bytes=Buffer.from(files[name]);assert.ok(bytes.length>100);
    if(ext==='png')assert.equal(bytes.subarray(1,4).toString(),'PNG');
    if(ext==='jpg'||ext==='jpeg')assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff');
    if(ext==='pdf'){assert.equal(bytes.subarray(0,5).toString(),'%PDF-');assert.ok(bytes.length<=1_000_000);}
    if(ext==='webp'){assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');}
    if(ext==='svg'){assert.match(bytes.toString(),/<svg\b/);assert.match(bytes.toString(),/data:image\/png;base64,/);}
    if(ext==='docx'){const entries=Object.keys(unzipSync(bytes));assert.ok(entries.includes('word/document.xml'));assert.ok(entries.some(n=>n.startsWith('word/media/')));}
    formats.push({format:ext,bytes:bytes.length});
   }
   const webp=files[Object.keys(files).find(n=>n.endsWith('.webp'))];
   const pixel=await page.evaluate(async bytes=>{const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'image/webp'}));try{const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);return{width:img.width,height:img.height,color:[...x.getImageData(10,10,1,1).data]};}finally{URL.revokeObjectURL(url);}},Array.from(webp));
   assert.equal(pixel.width,64);assert.equal(pixel.height,96);assert.ok(pixel.color[0]>180&&pixel.color[1]<140&&pixel.color[2]<90,'WEBP lost its orange paint');assert.deepEqual(errors,[]);
   assert.equal(codecRequests.length>0,!result.nativeWebP,'Codec should load only when native WEBP is unavailable');
   results.push({engine,nativeWebP:result.nativeWebP,localCodec:codecRequests.length>0,formats,decodedWebPPixels:'PASS'});await page.close();
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));}
const report={status:'PASS',checks:14,source_sha256:createHash('sha256').update(fs.readFileSync('src/studio/export.ts')).digest('hex'),results};
if(process.env.JOT_QA_REPORT)fs.writeFileSync(process.env.JOT_QA_REPORT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));

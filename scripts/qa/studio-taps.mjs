import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('tsx/package.json'))('esbuild');
// Use an existing Playwright installation. Missing engines fail; none are
// downloaded automatically and a skipped browser is never reported as PASS.
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const compiled=await build({entryPoints:['src/studio/paint-render.ts'],bundle:true,format:'iife',globalName:'JotPaint',write:false,platform:'browser'}),results=[];
for(const [engine,type,executable]of [['chromium',chromium,process.env.JOT_CHROMIUM_EXECUTABLE],['webkit',webkit,process.env.JOT_WEBKIT_EXECUTABLE]]){
 const browser=await type.launch({headless:true,...(executable?{executablePath:executable}:{})});
 try{
  const page=await browser.newPage();await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">');await page.addScriptTag({content:compiled.outputFiles[0].text});
  const checks=await page.evaluate(()=>{
   const output=[];
   for(const brush of ['round','pencil','crayon','marker','watercolor','eraser']){
    const render=count=>{const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');if(brush==='eraser'){ctx.fillStyle='#4466ee';ctx.fillRect(0,0,64,64);}window.JotPaint.paintOperation(ctx,{kind:'stroke',points:Array.from({length:count},()=>({x:32,y:32,pressure:1})),color:'#e6407e',size:12,opacity:1,brush:brush==='eraser'?'round':brush,erase:brush==='eraser'},64,64);return ctx.getImageData(0,0,64,64).data;};
    const down=render(1),released=render(2),center=(32*64+32)*4;
    output.push({brush,pixelParity:down.every((v,i)=>v===released[i]),visible:brush==='eraser'?released[center+3]===0:released[center+3]>0});
   }
   return output;
  });
  for(const check of checks){assert.equal(check.pixelParity,true,engine+' '+check.brush+' tap changed on release');assert.equal(check.visible,true,engine+' '+check.brush+' tap disappeared');}
  results.push({engine,checks});await page.close();
 }finally{await browser.close();}
}
const report={status:'PASS',checks:12,source_sha256:createHash('sha256').update(fs.readFileSync('src/studio/paint-render.ts')).digest('hex'),results};
if(process.env.JOT_QA_REPORT)fs.writeFileSync(process.env.JOT_QA_REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));

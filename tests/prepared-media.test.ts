import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {reviewSignature} from '../src/server/assets';

test('prepared media stays unverified until rights are documented and signed for the chosen environment',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'jot-prepared-'));
  try{
    const pixels=Buffer.alloc(128*128,255);
    for(let n=20;n<108;n++){pixels[20*128+n]=0;pixels[107*128+n]=0;pixels[n*128+20]=0;pixels[n*128+107]=0;}
    const source=path.join(dir,'source.png'),secretFile=path.join(dir,'secrets.json');
    await writeFile(source,await sharp(pixels,{raw:{width:128,height:128,channels:1}}).png().toBuffer());
    const secret='s'.repeat(40);await writeFile(secretFile,JSON.stringify({staging:{MEDIA_VALIDATION_SECRET:secret}}));
    const common=['--import','tsx','scripts/data/prepare-media.ts','--input',source,'--id','jc-test-prepared','--slug','test-prepared','--title','Test','--categories','animals','--secret-file',secretFile,'--environment','staging'];
    const run=(args:string[])=>spawnSync(process.execPath,[...common,...args],{encoding:'utf8',env:{...process.env,MEDIA_VALIDATION_SECRET:''}});
    const rejected=run(['--output',path.join(dir,'rejected'),'--rights-status','documented']);assert.notEqual(rejected.status,0);
    const output=path.join(dir,'prepared'),result=run(['--output',output]);assert.equal(result.status,0,result.stderr);
    const manifest=JSON.parse(await readFile(path.join(output,'manifest.json'),'utf8'));
    assert.equal(manifest.requested_status,'ready_for_review');assert.equal(manifest.provenance.rights_status,'unverified');assert.equal(manifest.provenance.source_type,'user_owned');assert.match(manifest.provenance.reference,/Rights review pending/);
    const reviews=JSON.parse(await readFile(path.join(output,'reviews.json'),'utf8'));
    assert.equal(reviews.length,5);for(const item of reviews)assert.equal(item.signature,await reviewSignature(item.review,secret));
  }finally{await rm(dir,{recursive:true,force:true});}
});

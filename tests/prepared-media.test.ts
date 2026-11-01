import {validAgeAssessment} from '../src/age/model';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {reviewSignature} from '../src/server/assets';
import {pngBinding} from '../src/social/png';
import {socialBinding} from '../src/social/model';
import {PDFDocument,PDFRawStream,PDFName} from 'pdf-lib';
import {reviewPrintablePDF} from '../scripts/data/pdf-review';

test('prepared media stays unverified until rights are documented and signed for the chosen environment',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'jot-prepared-'));
  try{
    const pixels=Buffer.alloc(128*128,255);
    for(let n=20;n<108;n++){pixels[20*128+n]=0;pixels[107*128+n]=0;pixels[n*128+20]=0;pixels[n*128+107]=0;}
    const source=path.join(dir,'source.png'),secretFile=path.join(dir,'secrets.json');
    await writeFile(source,await sharp(pixels,{raw:{width:128,height:128,channels:1}}).png().toBuffer());
    const secret='s'.repeat(40);await writeFile(secretFile,JSON.stringify({staging:{MEDIA_VALIDATION_SECRET:secret}}));
    const common=['--import','tsx','scripts/data/prepare-media.ts','--input',source,'--id','jc-test-prepared','--slug','test-prepared','--title','Square Outline','--description','A single square with a wide open center.','--alt','Black square outline on white.','--categories','animals','--category-review','Synthetic square fixture assigned to Animals solely for import integration testing.','--secret-file',secretFile,'--environment','staging'];
    const run=(args:string[])=>spawnSync(process.execPath,[...common,...args],{encoding:'utf8',env:{...process.env,MEDIA_VALIDATION_SECRET:''}});
    const missingAlt=spawnSync(process.execPath,[...common.filter((v,i,a)=>v!=='--alt'&&a[i-1]!=='--alt'),'--output',path.join(dir,'missing-copy')],{encoding:'utf8'});assert.notEqual(missingAlt.status,0);assert.match(missingAlt.stderr,/Required --alt/);
    const rejected=run(['--output',path.join(dir,'rejected'),'--rights-status','documented']);assert.notEqual(rejected.status,0);
    const output=path.join(dir,'prepared'),result=run(['--output',output]);assert.equal(result.status,0,result.stderr);
    const manifest=JSON.parse(await readFile(path.join(output,'manifest.json'),'utf8'));
    const categoryReview=JSON.parse(await readFile(path.join(output,'category-review.json'),'utf8'));assert.deepEqual(categoryReview.selected_categories,['animals']);assert.match(categoryReview.review_note,/Synthetic square/);const repeat=run(['--output',output]);assert.notEqual(repeat.status,0);assert.match(repeat.stderr,/fresh --output folder/);assert.equal(JSON.parse(await readFile(path.join(output,'manifest.json'),'utf8')).content_id,manifest.content_id);
    assert.equal(manifest.requested_status,'ready_for_review');assert.equal(manifest.provenance.rights_status,'unverified');assert.equal(manifest.provenance.source_type,'user_owned');assert.match(manifest.provenance.reference,/Rights review pending/);
    const imported=spawnSync(process.execPath,['--import','tsx','scripts/data/import-catalog.ts','--prepared',output],{encoding:'utf8'});
    assert.equal(imported.status,0,imported.stderr);
    assert.equal(JSON.parse(imported.stdout).valid,true);
    const reviews=JSON.parse(await readFile(path.join(output,'reviews.json'),'utf8'));
    assert.equal(reviews.length,12);for(const role of ['home_half_color','home_half_color_small','home_half_color_medium','color_inspiration'])assert.ok(manifest.assets.some((a:any)=>a.role===role),role);const og=manifest.assets.find((a:any)=>a.role==='social_og'),line=manifest.assets.find((a:any)=>a.role==='printable_webp_bw');assert.equal(og.source_asset_id,line.asset_id);assert.equal(og.mime,'image/png');assert.equal(og.black_and_white_verified,false);assert.deepEqual(pngBinding(await readFile(path.join(output,'social_og.png'))),socialBinding({...manifest,recommendedAge:manifest.age_recommendation.band,sourceSHA256:line.sha256}));assert.equal(manifest.assets.some((a:any)=>a.role==='printable_pdf_letter_bw'),false);assert.equal(validAgeAssessment(manifest.age_recommendation,manifest.assets.find((a:any)=>a.role==='printable_webp_bw').sha256),true);assert.equal(manifest.age_recommendation.band,'3-5');for(const item of reviews)assert.equal(item.signature,await reviewSignature(item.review,secret));
    const reviewPath=path.join(dir,'editorial.json'),newTitle='Open Square With Four Corners';
    await writeFile(reviewPath,JSON.stringify([{design_id:'square-fixture',title:newTitle,description:'A square outline surrounds a wide white center.',alt_text:'Four straight sides form a square outline.',tags:['square'],category_ids:['animals'],observations:'Synthetic square fixture has four straight black sides and a wide white interior; Animals is retained only for this import integration test.'}]));
    const rebound=path.join(dir,'rebound'),rebind=spawnSync(process.execPath,['--import','tsx','scripts/data/rebind-reviewed-metadata.ts',output,reviewPath,'square-fixture',rebound],{encoding:'utf8'});assert.equal(rebind.status,0,rebind.stderr);
    const changed=JSON.parse(await readFile(path.join(rebound,'manifest.json'),'utf8')),changedFiles=JSON.parse(await readFile(path.join(rebound,'files.json'),'utf8')),oldFiles=JSON.parse(await readFile(path.join(output,'files.json'),'utf8'));
    const oldPDF=await readFile(oldFiles.printable_pdf_a4_bw),newPDF=await readFile(changedFiles.printable_pdf_a4_bw),oldDoc=await PDFDocument.load(oldPDF),newDoc=await PDFDocument.load(newPDF);
    assert.equal(oldDoc.getTitle(),'Square Outline');assert.equal(newDoc.getTitle(),newTitle);assert.equal(changed.slug,manifest.slug,'editorial title corrections preserve accepted artwork URLs');assert.notEqual(changedFiles.printable_pdf_a4_bw,oldFiles.printable_pdf_a4_bw);
    const imageStreams=(doc:PDFDocument)=>doc.context.enumerateIndirectObjects().flatMap(([,object])=>object instanceof PDFRawStream&&object.dict.get(PDFName.of('Subtype'))===PDFName.of('Image')?[Buffer.from(object.getContents()).toString('base64')]:[]).sort();assert.deepEqual(imageStreams(newDoc),imageStreams(oldDoc),'an editorial title change must not re-encode accepted drawing or footer pixels');
    assert.equal(changed.assets.find((a:any)=>a.role==='printable_webp_bw').sha256,line.sha256);assert.equal(changedFiles.printable_webp_bw,oldFiles.printable_webp_bw);
    await assert.rejects(()=>reviewPrintablePDF(oldPDF,'printable_pdf_a4_bw',true,newTitle),/document title differs/);await reviewPrintablePDF(newPDF,'printable_pdf_a4_bw',true,newTitle);
    const updatedImport=spawnSync(process.execPath,['--import','tsx','scripts/data/import-catalog.ts','--prepared',rebound],{encoding:'utf8'});assert.equal(updatedImport.status,0,updatedImport.stderr);assert.equal(JSON.parse(updatedImport.stdout).valid,true);
    assert.deepEqual(pngBinding(await readFile(changedFiles.social_og)),socialBinding({...changed,recommendedAge:changed.age_recommendation.band,sourceSHA256:line.sha256}));
  }finally{await rm(dir,{recursive:true,force:true});}
});

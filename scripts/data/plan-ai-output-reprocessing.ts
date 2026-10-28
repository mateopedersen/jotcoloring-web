/** Pure local plan: never contacts a provider, writes remote storage or queues work. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {verifyBrandedRaster} from '../../src/server/branding';
import {LINE_ART_PROCESSING_VERSION} from '../../src/server/line-art';
const directory=path.resolve('../../ai-smoke-staging/photo-reprocessing'),job=JSON.parse(await fs.readFile(path.join(directory,'private-job-before.json'),'utf8'));
if(job.id!=='d2f8534f-e847-43f2-b5ea-0aec1cd2431c'||job.status!=='succeeded'||!job.provider_receipt)throw Error('Only the approved successful staging photo job is eligible.');
const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex'),source=await fs.readFile(path.join(directory,'provider-image')),sourceHash=sha(source),report=JSON.parse(await fs.readFile(path.join(directory,'processing-report.json'),'utf8'));
if(report.processing.version!==LINE_ART_PROCESSING_VERSION)throw Error('Reprocessed output version mismatch');
const nextRevision=sha(JSON.stringify({source_sha256:sourceHash,previous_revision:job.source_revision,processing_version:LINE_ART_PROCESSING_VERSION}));
const prefix=`jobs/${job.owner_id}/${job.id}/revisions/${nextRevision}`,assets=[];
for(const role of ['webp','color','pdf']){
 const file='reprocessed-'+role+'.'+(role==='pdf'?'pdf':'webp'),bytes=await fs.readFile(path.join(directory,file));
 if(sha(bytes)!==report.artifacts[role].sha256)throw Error('Output checksum changed after review');
 if(role==='pdf'){if(bytes.length>1_000_000)throw Error('PDF exceeds strict size limit');const pdf=await PDFDocument.load(bytes);if(pdf.getPageCount()!==1)throw Error('Expected one-page PDF');}
 else {const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});verifyBrandedRaster(data,info.width,info.height,info.channels,role==='webp');if(info.width!==job.width||info.height!==job.height)throw Error('Source dimensions changed')}
 assets.push({role,file,key:prefix+'/'+(role==='color'?'color-preview.webp':'line-art.'+role),bytes:bytes.length,sha256:sha(bytes),mime:role==='pdf'?'application/pdf':'image/webp'});
}
const action='ai_reprocess_saved_source_open_dark_v1',actor='operator:outline-repair-20261028';
const sql="UPDATE creator_job SET source_revision=?,line_art_key=?,color_preview_key=?,pdf_key=? WHERE id=? AND status='succeeded' AND source_revision=? AND line_art_key=? AND color_preview_key=? AND pdf_key=? AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now') AND EXISTS(SELECT 1 FROM ai_free_reservation r WHERE r.job_id=creator_job.id AND r.provider_receipt=?) AND NOT EXISTS(SELECT 1 FROM audit_event a WHERE a.target_id=creator_job.id AND a.action=?) RETURNING id,status,source_revision;";
const plan={mode:'PLAN_ONLY_NO_INFERENCE',prepared_at:new Date().toISOString(),account:'48c779c8eaa80234e0bb9d57f96e588b',database:'835240f5-90d7-4bf2-8a41-b67cc484fb4b',bucket:'jotcoloring-staging-jobs',job_id:job.id,source_key:`jobs/${job.owner_id}/${job.id}/provider-image`,source_sha256:sourceHash,previous_revision:job.source_revision,next_revision:nextRevision,processing:report.processing,expires_at:job.expires_at,owner_id:job.owner_id,assets,revision_key:prefix+'/revision.json',preconditions:['Verify exact successful job, prior revision/result keys, receipt and unexpired state.','Download and hash the existing private provider-image; require source_sha256.','Upload only new revision keys. If any already exists, require its exact SHA256; never overwrite differing bytes.','Read all uploaded objects back and verify checksums before any database mutation.','Keep original provider image and old output keys unchanged. No new AI request, reservation, job or queue message.','Commit the UPDATE and conditional audit INSERT in one atomic D1 batch; require one changed job and one audit.','On ambiguous mutation outcome, inspect existing revision and audit read-only; never repeat inference.','After commit, verify authenticated result links return the new SHA256 and the old source file hash is unchanged.'],atomic_batch:[{sql,params:[nextRevision,assets.find(a=>a.role==='webp')!.key,assets.find(a=>a.role==='color')!.key,assets.find(a=>a.role==='pdf')!.key,job.id,job.source_revision,job.line_art_key,job.color_preview_key,job.pdf_key,job.provider_receipt,action]},{sql:'INSERT INTO audit_event(actor,action,target_id,version) SELECT ?,?,?,NULL WHERE changes()=1;',params:[actor,action,job.id]}]};
await fs.writeFile(path.join(directory,'reprocessing-plan.json'),JSON.stringify(plan,null,2),{mode:0o600});
console.log(JSON.stringify({mode:plan.mode,job_id:job.id,revision:nextRevision,assets:assets.map(({role,bytes,sha256})=>({role,bytes,sha256})),provider_calls:0}));

import type {Env} from './types';
/** Retain accounting/idempotency records, but erase prompt text and private file
 * pointers only after confirming that the complete expired result prefix is gone. */
export async function cleanupPrivateJobs(env:Env,now=new Date().toISOString()){
 const db=env.CATALOG_DB,bucket=env.JOB_ASSETS;if(!db||!bucket)return;
 const uploads=await db.prepare("SELECT id,object_key FROM creator_upload WHERE expires_at<? AND status<>'expired' LIMIT 50").bind(now).all<{id:string;object_key:string}>();
 for(const upload of uploads.results){await bucket.delete(upload.object_key);await db.prepare("UPDATE creator_upload SET status='expired' WHERE id=?").bind(upload.id).run()}
 const jobs=await db.prepare("SELECT id,owner_id FROM creator_job WHERE expires_at<? AND (status<>'expired' OR parameters_json<>'{}' OR input_key IS NOT NULL OR line_art_key IS NOT NULL OR color_preview_key IS NOT NULL OR pdf_key IS NOT NULL) LIMIT 20").bind(now).all<{id:string;owner_id:string}>();
 for(const job of jobs.results){
  const prefix=`jobs/${job.owner_id}/${job.id}/`,page=await bucket.list({prefix,limit:100});
  if(page.objects.length)await bucket.delete(page.objects.map(object=>object.key));
  // A job with many revisions remains eligible for the next scheduled batch.
  const remaining=await bucket.list({prefix,limit:1});if(remaining.objects.length||remaining.truncated)continue;
  await db.prepare("UPDATE creator_job SET status='expired',parameters_json='{}',input_key=NULL,line_art_key=NULL,color_preview_key=NULL,pdf_key=NULL WHERE id=? AND expires_at<?").bind(job.id,now).run();
 }
}

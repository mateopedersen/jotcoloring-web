/** Local-only streaming batch classifier. No cloud API, no publishing, no upload. */
import {createReadStream,createWriteStream} from 'node:fs';
import fs from 'node:fs/promises';
import {createInterface} from 'node:readline';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {once} from 'node:events';
import {CategoryQueue,type CategoryJob} from './category-queue';
import {analyzeAgeImage,releaseAgeModel} from './age-vision';
import {preparedCategorySelection} from './category-selection';
const args=process.argv.slice(2),option=(key:string)=>args[args.indexOf(key)+1];
if(!args.includes('--input')||!args.includes('--output'))throw new Error('Use --input local-jobs.jsonl --output local-folder [--max-items 100] [--retry-failed].');
const out=path.resolve(option('--output')),limit=Number(args.includes('--max-items')?option('--max-items'):100);
if(!Number.isSafeInteger(limit)||limit<1||limit>10000)throw new Error('Each run must process 1–10,000 items. Resume for the next bounded batch.');
await fs.mkdir(out,{recursive:true});const queue=new CategoryQueue(path.join(out,'checkpoint.sqlite'));const start=Date.now();let completed=0,failed=0;
try{
 let pending:CategoryJob[]=[];const lines=createInterface({input:createReadStream(option('--input')),crlfDelay:Infinity});for await(const line of lines){if(!line.trim())continue;const job=JSON.parse(line);job.file=path.resolve(job.file);pending.push(job);if(pending.length===1000){queue.enqueueMany(pending);pending=[];}}if(pending.length)queue.enqueueMany(pending);
 if(args.includes('--retry-failed'))queue.retryFailed();
 for(let i=0;i<limit;i++){const job=queue.claim();if(!job)break;try{const stat=await fs.stat(job.file);if(stat.size>25_000_000)throw new Error('Source exceeds 25 MB.');const bytes=await fs.readFile(job.file);if(createHash('sha256').update(bytes).digest('hex')!==job.sha256)throw new Error('Source changed after enqueue; submit its new checksum.');const age=await analyzeAgeImage(bytes,{brandFooter:!!job.branded}),analysis=age.category_analysis;const selection=analysis.review_required?null:preparedCategorySelection(analysis,job.sha256);if(!queue.finish(job.job_key,job.token,{analysis,selection,age_band:age.band,difficulty_score:age.score}))throw new Error('The processing lease expired.');completed++;console.log(JSON.stringify({id:job.content_id,categories:analysis.category_ids,review_required:analysis.review_required}));}catch(e){queue.fail(job.job_key,job.token,e instanceof Error?e.message:String(e));failed++;}}
 const output=createWriteStream(path.join(out,'results.jsonl'));for(const row of queue.results())if(!output.write(JSON.stringify(row)+'\n'))await once(output,'drain');output.end();await once(output,'finish');
 const report={started_at:new Date(start).toISOString(),local_only:true,paid_inference_calls:0,completed_this_run:completed,failed_this_run:failed,elapsed_ms:Date.now()-start,states:queue.summary()};await fs.writeFile(path.join(out,'summary.json'),JSON.stringify(report,null,2));await fs.appendFile(path.join(out,'runs.jsonl'),JSON.stringify(report)+'\n');
}finally{queue.close();await releaseAgeModel();}
if(failed)process.exitCode=1;

import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {CATEGORY_ENGINE_VERSION} from '../../src/taxonomy/analysis';
import {TAXONOMY_VERSION} from '../../src/taxonomy/catalog';
export interface CategoryJob {id:string;file:string;sha256:string;branded:boolean}
/** Disk-backed bounded work queue. The source/version key survives restarts and retries. */
export class CategoryQueue {
 readonly db:DatabaseSync;
 readonly generation=CATEGORY_ENGINE_VERSION+":"+TAXONOMY_VERSION;
 constructor(file:string){this.db=new DatabaseSync(file);this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS category_job(job_key TEXT PRIMARY KEY,content_id TEXT NOT NULL,file TEXT NOT NULL,sha256 TEXT NOT NULL,branded INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,lease_until INTEGER,token TEXT,result_json TEXT,error TEXT); `);if(!this.db.prepare('PRAGMA table_info(category_job)').all().some(c=>c.name==='generation'))this.db.exec("ALTER TABLE category_job ADD COLUMN generation TEXT NOT NULL DEFAULT 'legacy'");this.db.exec('CREATE INDEX IF NOT EXISTS category_generation_pending ON category_job(generation,state,lease_until,job_key)');}
 enqueue(job:CategoryJob){if(!/^[a-zA-Z0-9_-]{1,128}$/.test(job.id)||!/^[a-f0-9]{64}$/.test(job.sha256)||typeof job.file!=='string'||!job.file||typeof job.branded!=='boolean')throw new Error('A stable ID, local file, SHA-256 and branded flag are required.');const key=createHash('sha256').update(JSON.stringify([job.id,job.sha256,job.branded,TAXONOMY_VERSION,CATEGORY_ENGINE_VERSION])).digest('hex');this.db.prepare('INSERT OR IGNORE INTO category_job(job_key,content_id,file,sha256,branded,generation) VALUES(?,?,?,?,?,?)').run(key,job.id,job.file,job.sha256,Number(job.branded),this.generation);return key;}
 enqueueMany(jobs:CategoryJob[]){this.db.exec('BEGIN');try{for(const job of jobs)this.enqueue(job);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}}
 claim(now=Date.now()){const token=randomUUID();const row=this.db.prepare(`UPDATE category_job SET state='running',attempts=attempts+1,lease_until=?,token=? WHERE job_key=(SELECT job_key FROM category_job WHERE generation=? AND (state='pending' OR (state='running' AND lease_until<?)) ORDER BY job_key LIMIT 1) RETURNING *`).get(now+600_000,token,this.generation,now);return row as undefined|{job_key:string;content_id:string;file:string;sha256:string;branded:number;token:string};}
 finish(key:string,token:string,result:unknown){return Number(this.db.prepare("UPDATE category_job SET state='complete',result_json=?,error=NULL,lease_until=NULL WHERE job_key=? AND token=? AND state='running'").run(JSON.stringify(result),key,token).changes)===1;}
 fail(key:string,token:string,error:string){this.db.prepare("UPDATE category_job SET state='failed',error=?,lease_until=NULL WHERE job_key=? AND token=? AND state='running'").run(error.slice(0,600),key,token);}
 retryFailed(){this.db.prepare("UPDATE category_job SET state='pending',error=NULL WHERE generation=? AND state='failed' AND attempts<3").run(this.generation);}
 summary(){return this.db.prepare('SELECT state,COUNT(*) AS count FROM category_job WHERE generation=? GROUP BY state').all(this.generation);}
 *results(){for(const row of this.db.prepare("SELECT content_id,sha256,state,result_json,error FROM category_job WHERE generation=? ORDER BY content_id").iterate(this.generation))yield row;}
 close(){this.db.close();}
}

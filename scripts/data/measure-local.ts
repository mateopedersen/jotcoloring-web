import {localStorage} from './local-storage';
const mf=localStorage();try{for(const name of ['CATALOG_DB','SEARCH_DB']){const db=await mf.getD1Database(name);const r=await db.prepare('SELECT 1').run();console.log(JSON.stringify({database:name,bytes:r.meta.size_after,measured_at:new Date().toISOString(),source:'D1Result.meta.size_after',environment:'local'}))}}finally{await mf.dispose()}

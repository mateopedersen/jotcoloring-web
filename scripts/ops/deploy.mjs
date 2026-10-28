/** Publish only an explicitly selected, verified JotColoring build. */
import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const stage=process.argv[2],apply=process.argv.includes('--apply');
if(!['staging','production'].includes(stage))throw new Error('Choose staging or production explicitly.');
const config=JSON.parse(await fs.readFile('dist/server/wrangler.json','utf8'));
const expected={staging:['835240f5-90d7-4bf2-8a41-b67cc484fb4b','1f4852c1-2b4d-4e80-99a3-f86be83858b6'],production:['d075722e-c698-4b6e-a5e4-f53ae5c9e411','59133e5c-f73a-42d2-8b8b-223720e8b6ec']}[stage];
if(config.name!==`jotcoloring-${stage}`||config.account_id!=='48c779c8eaa80234e0bb9d57f96e588b'||config.vars?.APP_ENV!==stage)throw new Error('Build name, account or environment mismatch. Rebuild the requested environment.');
if(JSON.stringify(config.d1_databases.map(d=>d.database_id).sort())!==JSON.stringify(expected.sort())||config.r2_buckets.length!==4||config.r2_buckets.some(b=>!b.bucket_name.startsWith(`jotcoloring-${stage}-`)))throw new Error('Database or storage environment mismatch.');
console.log(JSON.stringify({mode:apply?'APPLY':'PLAN_ONLY',worker:config.name,environment:stage,databases:config.d1_databases.map(d=>d.database_name),buckets:config.r2_buckets.map(b=>b.bucket_name)}));
if(apply){const result=spawnSync('pnpm',['exec','wrangler','deploy','--config','dist/server/wrangler.json','--name',config.name],{stdio:'inherit',env:process.env});process.exit(result.status??1);}

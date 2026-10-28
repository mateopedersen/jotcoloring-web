import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {assertReleaseTargets,assertCiPublication,createArtifactManifest,verifyArtifactManifest} from '../scripts/ops/deploy-release';
const webRoot=JSON.parse(await fs.readFile('wrangler.jsonc','utf8')),jobs=JSON.parse(await fs.readFile('workers/jobs/wrangler.jsonc','utf8'));
test('release allows only the exact web/jobs workers and environment resources',()=>{
  for(const stage of ['staging','production'] as const){const web={...webRoot,...webRoot.env[stage]};const plan=assertReleaseTargets(stage,web,jobs);assert.deepEqual(plan.order,[`jotcoloring-${stage}-jobs`,`jotcoloring-${stage}`]);
    const wrong=structuredClone(web);wrong.d1_databases[0].database_id=stage==='staging'?webRoot.env.production.d1_databases[0].database_id:webRoot.env.staging.d1_databases[0].database_id;assert.throws(()=>assertReleaseTargets(stage,wrong,jobs),/D1/);
    const route=structuredClone(web);route.routes[0].zone_id='unrelated-zone';assert.throws(()=>assertReleaseTargets(stage,route,jobs),/route/);
    const paid=structuredClone(web);paid.vars.AI_BILLING_MODE='paid';assert.throws(()=>assertReleaseTargets(stage,paid,jobs),/free-only/);
    const gateway=structuredClone(web);gateway.vars.AI_FREE_GATEWAY_URL='https://unreviewed-gateway.invalid';assert.throws(()=>assertReleaseTargets(stage,gateway,jobs),/gateway/);
    for(const [key,value]of [['AI_FREE_DAILY_NEURONS','9001'],['AI_FREE_DAILY_NEURONS','NaN'],['AI_FREE_MAX_JOB_NEURONS','301'],['AI_MODEL_ID','unreviewed-model']]){const changed=structuredClone(web);changed.vars[key]=value;assert.throws(()=>assertReleaseTargets(stage,changed,jobs),/free-only/);}
    const fallback=structuredClone(web);fallback.ai={binding:'AI'};assert.throws(()=>assertReleaseTargets(stage,fallback,jobs),/free-only/);
  }
  const wrongJobs=structuredClone(jobs);wrongJobs.env.staging.queues.consumers[0].dead_letter_queue='jotcoloring-production-dead-letter';assert.throws(()=>assertReleaseTargets('staging',{...webRoot,...webRoot.env.staging},wrongJobs),/DLQ/);
});
test('publication rejects PRs, forks, wrong branch/account and missing tokens',()=>{
  const env={GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'push',GITHUB_REPOSITORY:'mateopedersen/jotcoloring-web',GITHUB_REF:'refs/heads/main',CLOUDFLARE_ACCOUNT_ID:'48c779c8eaa80234e0bb9d57f96e588b',CLOUDFLARE_API_TOKEN:'unit-test-placeholder'};
  assert.equal(assertCiPublication('production',env),'main');
  for(const [key,value]of [['GITHUB_EVENT_NAME','pull_request'],['GITHUB_EVENT_NAME','pull_request_target'],['GITHUB_REPOSITORY','fork-owner/jotcoloring-web'],['GITHUB_REF','refs/heads/staging'],['CLOUDFLARE_ACCOUNT_ID','unrelated'],['CLOUDFLARE_API_TOKEN','']])assert.throws(()=>assertCiPublication('production',{...env,[key]:value}));
});
test('release artifact binds all bytes including hidden files to commit, lock and environment',async()=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'jot-release-')),commit='a'.repeat(40),lock='b'.repeat(64);
  try{await fs.mkdir(path.join(root,'server'));await fs.mkdir(path.join(root,'client'));await fs.writeFile(path.join(root,'server/wrangler.json'),'{}');await fs.writeFile(path.join(root,'server/entry.mjs'),'export default {};');await fs.writeFile(path.join(root,'client/.assetsignore'),'_worker.js');const manifest=await createArtifactManifest(root,'staging',commit,lock);assert.equal(manifest.files.length,3);await verifyArtifactManifest(root,manifest,'staging',commit,lock);await assert.rejects(()=>verifyArtifactManifest(root,manifest,'production',commit,lock));await assert.rejects(()=>verifyArtifactManifest(root,manifest,'staging','c'.repeat(40),lock));await fs.writeFile(path.join(root,'server/entry.mjs'),'export default {changed:true};');await assert.rejects(()=>verifyArtifactManifest(root,manifest,'staging',commit,lock));await fs.symlink(path.join(root,'server/entry.mjs'),path.join(root,'client/leak'));await assert.rejects(()=>createArtifactManifest(root,'staging',commit,lock),/symlinks/);}finally{await fs.rm(root,{recursive:true,force:true});}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {advertisingChoice,parseAdvertisingChoice,mayRequestAdvertising,permitsAdvertising,ADVERTISING_CHOICE_LIFETIME,isApprovedAdvertisingOrigin} from '../src/advertising/model';
const now=Date.UTC(2026,10,16),accepted=advertisingChoice(true,now);
test('only the adult-specific collection permits optional ads',()=>{
 for(const path of ['/coloring-by-age/adults/'])assert.equal(permitsAdvertising(path),true);
 for(const path of ['/','/licensing/','/contact/','/coloring-by-age/','/coloring-by-age/3-5/','/coloring-by-age/teens/','/coloring-pages/all/','/coloring-pages/bluey/','/coloring/example/','/download/example/','/studio/','/create/','/licensing/?age=adult','/coloring-by-age/adults/fake/'])assert.equal(permitsAdvertising(path),false,path);
});
test('saved optional consent alone never permits an ad request and age is not persisted',()=>{
 for(const age of ['unknown','under18','private'] as const)assert.equal(mayRequestAdvertising('/coloring-by-age/adults/',age,accepted),false);
 assert.equal(mayRequestAdvertising('/coloring-by-age/adults/','adult',accepted),true);
 assert.equal(mayRequestAdvertising('/coloring-by-age/3-5/','adult',accepted),false);
 assert.equal(mayRequestAdvertising('/coloring-by-age/adults/','adult',advertisingChoice(false,now)),false);
 assert.equal(mayRequestAdvertising('/coloring-by-age/adults/','adult',undefined),false);
 assert.deepEqual(Object.keys(accepted).sort(),['allowed','expiresAt','savedAt','version']);
});
test('expired, malformed and future consent choices fail closed',()=>{
 assert.deepEqual(parseAdvertisingChoice(JSON.stringify(accepted),now),accepted);
 for(const raw of [null,'{}','true','{"version":1,"allowed":"true"}',JSON.stringify({...accepted,savedAt:now+1}),JSON.stringify({...accepted,expiresAt:now}),JSON.stringify({...accepted,expiresAt:now+ADVERTISING_CHOICE_LIFETIME+1})])assert.equal(parseAdvertisingChoice(raw,now),undefined);
});

test('opaque query parameters and fragments cannot activate advertising',()=>{
 for(const query of ['?q=private+notes','?utm_source=example','?age=18','?']){assert.equal(permitsAdvertising('/coloring-by-age/adults/',query),false);assert.equal(mayRequestAdvertising('/coloring-by-age/adults/','adult',accepted,query),false);}
 assert.equal(mayRequestAdvertising('/coloring-by-age/adults/','adult',accepted,'','#private'),false);
});

test('real ad tags never load on local, staging or alternate-origin previews',()=>{
 assert.equal(isApprovedAdvertisingOrigin('https://jotcoloring.com'),true);
 for(const origin of ['http://jotcoloring.com','https://www.jotcoloring.com','http://127.0.0.1:8145','https://staging.jotcoloring.com','https://jotcoloring.example','https://jotcoloring.com.evil.test'])assert.equal(isApprovedAdvertisingOrigin(origin),false,origin);
});

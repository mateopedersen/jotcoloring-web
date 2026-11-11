import test from 'node:test';
import assert from 'node:assert/strict';
import {SearchRequestPool} from '../src/ui/search-request-pool';
import {LatestRequest} from '../src/ui/latest-request';
const deferred=<T>()=>{let resolve!:(value:T)=>void;const promise=new Promise<T>(yes=>resolve=yes);return{promise,resolve};};
const tick=()=>new Promise<void>(resolve=>setTimeout(resolve,0));

test('rapid search changes finish their transport but only display the latest response',async()=>{
 const pool=new SearchRequestPool<string>(),requests=new LatestRequest({abortOnCancel:false}),old=deferred<string>(),fresh=deferred<string>(),events:string[]=[],signals:AbortSignal[]=[];
 const first=requests.run(()=>pool.run('byd',signal=>{signals.push(signal);return old.promise;}),value=>events.push(value),()=>events.push('old error'),()=>events.push('old settled'));
 await tick();requests.cancel();
 const second=requests.run(()=>pool.run('byd seal',signal=>{signals.push(signal);return fresh.promise;}),value=>events.push(value),()=>events.push('new error'),()=>events.push('new settled'));
 await tick();assert.ok(signals.every(signal=>!signal.aborted));fresh.resolve('BYD Seal');await second;old.resolve('BYD');await first;
 assert.deepEqual(events,['BYD Seal','new settled']);
});
test('search work has two slots, one coalesced pending query and deduplicated identical requests',async()=>{
 const pool=new SearchRequestPool<string>(),a=deferred<string>(),b=deferred<string>(),started:string[]=[];
 const first=pool.run('a',()=>{started.push('a');return a.promise;}),second=pool.run('b',()=>{started.push('b');return b.promise;});
 const skipped=pool.run('c',async()=>{started.push('c');return 'c';});const skippedCheck=assert.rejects(skipped,/superseded/);
 const latest=pool.run('d',async()=>{started.push('d');return 'd';});
 assert.equal(pool.run('d',async()=>{throw new Error('Duplicate transport');}),latest);
 await tick();assert.deepEqual(started,['a','b']);a.resolve('a');assert.equal(await latest,'d');await skippedCheck;b.resolve('b');await Promise.all([first,second]);assert.deepEqual(started,['a','b','d']);
});
test('an unresponsive search has a deadline and cannot replace the recovered query later',async()=>{
 const pool=new SearchRequestPool<string>({timeoutMs:30}),old=deferred<string>();let signal!:AbortSignal;
 await assert.rejects(pool.run('stalled',s=>{signal=s;return old.promise;}),/timed out/);assert.equal(signal.aborted,true);
 assert.equal(await pool.run('healthy',async()=> 'recovered'),'recovered');old.resolve('too late');await tick();
 assert.equal(await pool.run('stalled',async()=> 'retry succeeds'),'retry succeeds');
});
test('the latest queued query also expires if all slots are stalled',async()=>{
 const pool=new SearchRequestPool<string>({timeoutMs:30}),never=deferred<string>();
 await Promise.all(['one','two','latest'].map(key=>assert.rejects(pool.run(key,()=>never.promise),/timed out/)));
 assert.equal(await pool.run('recovered',async()=> 'ready'),'ready');never.resolve('late');
});
test('default request cancellation remains unchanged outside search',async()=>{
 const requests=new LatestRequest(),old=deferred<string>();let signal!:AbortSignal;
 const run=requests.run(s=>{signal=s;return old.promise;},()=>assert.fail('Stale success'),()=>assert.fail('Stale error'),()=>assert.fail('Stale busy change'));
 requests.cancel();assert.equal(signal.aborted,true);old.resolve('ignored');await run;
});

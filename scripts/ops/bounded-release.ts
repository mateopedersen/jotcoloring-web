/** Independent content IDs only. Stop scheduling after a failure, and let every
 * already-started publication settle before returning a resumable report. */
export async function runBounded<T>(items: readonly T[], concurrency: number, run: (item:T)=>Promise<void>) {
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>3)throw new Error('Publication concurrency must be 1, 2 or 3.');
 let cursor=0,failed=false,failure:unknown;
 async function worker(){while(!failed){const index=cursor++;if(index>=items.length)return;try{await run(items[index]);}catch(error){if(!failed){failed=true;failure=error;}return;}}}
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},worker));
 if(failed)throw failure;
}

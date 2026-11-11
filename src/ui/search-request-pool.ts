interface SearchJob<T>{
 key:string;load:(signal:AbortSignal)=>Promise<T>;controller:AbortController;
 promise:Promise<T>;resolve:(value:T)=>void;reject:(error:Error)=>void;
 timer:ReturnType<typeof setTimeout>;running:boolean;done:boolean;
}

/** Keep typing independent of transport cancellation, with bounded work and wait. */
export class SearchRequestPool<T>{
 private jobs=new Map<string,SearchJob<T>>();
 private pending:SearchJob<T>|undefined;
 private active=0;
 constructor(private options:{timeoutMs?:number;concurrency?:number}={}){}
 run(key:string,load:(signal:AbortSignal)=>Promise<T>):Promise<T>{
  const existing=this.jobs.get(key);if(existing)return existing.promise;
  let resolve!:(value:T)=>void,reject!:(error:Error)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  const job:SearchJob<T>={key,load,controller:new AbortController(),promise,resolve,reject,timer:undefined!,running:false,done:false};
  this.jobs.set(key,job);
  // The deadline includes queue time, so a slow earlier query cannot leave the
  // currently typed query displaying an unbounded loading message.
  job.timer=setTimeout(()=>{job.controller.abort();this.finish(job,undefined,new Error('Search timed out'));},this.options.timeoutMs??4000);
  if(this.active<(this.options.concurrency??2))this.start(job);
  else{
   if(this.pending)this.finish(this.pending,undefined,new Error('Search superseded'));
   this.pending=job;
  }
  return promise;
 }
 private start(job:SearchJob<T>){
  job.running=true;this.active++;
  Promise.resolve().then(()=>job.load(job.controller.signal)).then(value=>this.finish(job,value),error=>this.finish(job,undefined,error instanceof Error?error:new Error('Search unavailable')));
 }
 private finish(job:SearchJob<T>,value?:T,error?:Error){
  if(job.done)return;job.done=true;clearTimeout(job.timer);
  if(this.jobs.get(job.key)===job)this.jobs.delete(job.key);
  if(this.pending===job)this.pending=undefined;
  if(job.running)this.active--;
  if(error)job.reject(error);else job.resolve(value!);
  if(this.pending&&this.active<(this.options.concurrency??2)){const next=this.pending;this.pending=undefined;this.start(next);}
 }
}

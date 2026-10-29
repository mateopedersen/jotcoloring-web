/** A superseded request must never replace a newer preview, error or busy state. */
export class LatestRequest {
 private sequence=0;
 private controller:AbortController|undefined;
 cancel(){this.sequence++;this.controller?.abort();}
 async run<T>(load:(signal:AbortSignal)=>Promise<T>,success:(value:T)=>void,failure:(error:unknown)=>void,settled:()=>void){
  this.cancel();const serial=this.sequence,controller=new AbortController();this.controller=controller;
  try{const result=await load(controller.signal);if(serial===this.sequence&&!controller.signal.aborted)success(result);}
  catch(error){if(serial===this.sequence&&!controller.signal.aborted)failure(error);}
  finally{if(serial===this.sequence)settled();}
 }
}

/** Two independent operations at a time; drain peers before propagating failure. */
export async function forEachInPairs<T>(items:readonly T[],visit:(item:T,index:number)=>Promise<unknown>){
 for(let start=0;start<items.length;start+=2){
  const results=await Promise.allSettled(items.slice(start,start+2).map((item,offset)=>Promise.resolve().then(()=>visit(item,start+offset))));
  for(const result of results)if(result.status==='rejected')throw result.reason;
 }
}

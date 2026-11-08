/** Two independent operations at a time; drain peers before propagating failure. */
export async function forEachInPairs<T>(items:readonly T[],visit:(item:T,index:number)=>Promise<unknown>){
 return forEachInGroups(items,2,visit);
}
/** Four independent object operations; retain the same peer-draining failure barrier. */
export async function forEachInFours<T>(items:readonly T[],visit:(item:T,index:number)=>Promise<unknown>){
 return forEachInGroups(items,4,visit);
}
async function forEachInGroups<T>(items:readonly T[],size:2|4,visit:(item:T,index:number)=>Promise<unknown>){
 for(let start=0;start<items.length;start+=size){
  const results=await Promise.allSettled(items.slice(start,start+size).map((item,offset)=>Promise.resolve().then(()=>visit(item,start+offset))));
  for(const result of results)if(result.status==='rejected')throw result.reason;
 }
}

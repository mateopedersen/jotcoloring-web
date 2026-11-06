import type {Database,Statement} from './types';

const adapters=new WeakMap<Database,Database>();
const MAX_PENDING_READS=128;

export function isCatalogOverloaded(error:unknown):boolean{
 const message=error instanceof Error?error.message:String(error);
 return /D1.*(?:overloaded|too many resources consumed)|D1_ERROR.*(?:temporarily unavailable|database is locked)/i.test(message);
}

/** Share only simultaneous public reads. Completed results are never retained,
 * so publication, withdrawal and source replacement remain immediately visible.
 * Writes, transactions and imports keep their original execution semantics. */
export function publicCatalogDatabase(db:Database):Database{
 const existing=adapters.get(db);if(existing)return existing;
 const pending=new Map<string,Promise<unknown>>();
 const read=<T>(key:string,execute:()=>Promise<T>):Promise<T>=>{
  const current=pending.get(key);if(current)return current.then(value=>structuredClone(value) as T);
  const result=(async()=>{
   try{return await execute();}
   catch(error){
    if(!isCatalogOverloaded(error))throw error;
    // One bounded retry for an idempotent read, with jitter across isolates.
    await new Promise(resolve=>setTimeout(resolve,150+Math.floor(Math.random()*150)));
    return execute();
   }
  })();
  if(pending.size<MAX_PENDING_READS){pending.set(key,result);void result.finally(()=>{if(pending.get(key)===result)pending.delete(key);}).catch(()=>{});}
  return result.then(value=>structuredClone(value));
 };
 const adapter:Database={
  prepare(sql){
   const statement=db.prepare(sql);
   if(!/^\s*SELECT\b/i.test(sql))return statement;
   const wrap=(bound:Statement,values:unknown[]):Statement=>({
    bind(...parameters){return wrap(statement.bind(...parameters),parameters);},
    first<T>(column?:string){return read<T|null>(JSON.stringify([sql,values,'first',column]),()=>bound.first<T>(column));},
    all<T>(){return read(JSON.stringify([sql,values,'all']),()=>bound.all<T>());},
    run<T>(){return bound.run<T>();}
   });
   return wrap(statement,[]);
  },
  batch(statements){return db.batch(statements);},
  exec(sql){return db.exec(sql);}
 };
 adapters.set(db,adapter);return adapter;
}

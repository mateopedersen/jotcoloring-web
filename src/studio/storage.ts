import { PROJECT_SCHEMA, type Project, type Favorite } from './model';
import {packProject,unpackProject,mayRetryBinary} from './storage-binary';
const DB_NAME = 'jotcoloring-artwork';
let pending: Promise<IDBDatabase> | undefined;
function database() {
  return pending ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { for (const name of ['projects','favorites']) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, {keyPath:'id'}); };
    request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); pending=undefined; }; resolve(request.result); };
    request.onerror = () => { pending=undefined; reject(new Error('Your browser could not open local storage. Please allow site storage and try again.')); };
    request.onblocked = () => { pending=undefined; reject(new Error('Close other JotColoring tabs to update local storage.')); };
  });
}
async function transact<T>(store: string, mode: IDBTransactionMode, operation: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const tx=db.transaction(store,mode); let result:T; const req=operation(tx.objectStore(store));
    req.onsuccess=()=>{result=req.result;};
    tx.oncomplete=()=>resolve(result); tx.onabort=()=>reject(new Error(tx.error?.name==='QuotaExceededError'?'Your device storage is full. Export your work, then free some space.':'Could not save on this device. Keep this tab open and try again.',{cause:tx.error}));
  });
}
export async function saveProject(project: Project) {
  try{await transact('projects','readwrite',s=>s.put(project));}
  catch(error){if(!mayRetryBinary(error))throw error;const encoded=await packProject(project);await transact('projects','readwrite',s=>s.put(encoded));}
}
export async function getProject(id: string): Promise<Project | undefined> {
  const stored=await transact<Project|undefined>('projects','readonly',s=>s.get(id));const value=stored?unpackProject(stored):undefined;
  if(value?.schema===1){value.schema=PROJECT_SCHEMA;value.objects=[];for(const snapshot of [...value.undo,...value.redo])snapshot.objects=[];}
  if(value?.schema===2)value.schema=PROJECT_SCHEMA;
  if(value && value.schema!==PROJECT_SCHEMA) throw new Error('This project uses a newer format. Update JotColoring before opening it.');
  return value;
}
export async function getProjects() { return (await transact<Project[]>('projects','readonly',s=>s.getAll())).map(unpackProject).sort((a,b)=>b.updatedAt-a.updatedAt); }
export async function deleteProject(id: string) { await transact('projects','readwrite',s=>s.delete(id)); }
export async function getFavorites() { return (await transact<Favorite[]>('favorites','readonly',s=>s.getAll())).sort((a,b)=>b.savedAt-a.savedAt); }
export async function isFavorite(id: string) { return Boolean(await transact('favorites','readonly',s=>s.get(id))); }
export async function toggleFavorite(favorite: Omit<Favorite,'savedAt'>) {
  const db=await database();
  return new Promise<boolean>((resolve,reject)=>{const tx=db.transaction('favorites','readwrite');const s=tx.objectStore('favorites');const req=s.get(favorite.id);let added=false;req.onsuccess=()=>{if(req.result)s.delete(favorite.id);else{added=true;s.put({...favorite,savedAt:Date.now()});}};tx.oncomplete=()=>resolve(added);tx.onerror=tx.onabort=()=>reject(new Error('Favorites could not be saved on this device.'));});
}

/** Change a name against the latest record without replacing newer canvas edits. */
export async function renameSavedItem(kind:'project'|'favorite',id:string,title:string){
 const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction(kind==='project'?'projects':'favorites','readwrite'),store=tx.objectStore(kind==='project'?'projects':'favorites'),req=store.get(id);req.onsuccess=()=>{const value=req.result;if(!value){tx.abort();return;}value.title=title.trim().slice(0,120);store.put(value);};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(new Error('The artwork name could not be changed. Reload and try again.'));});
}
export async function deleteFavorite(id:string){await transact('favorites','readwrite',s=>s.delete(id));}
/** Imported IDs are new: add() fails atomically instead of overwriting existing work. */
export async function addImportedItems(projects:Project[],favorites:Favorite[]){
 const db=await database();const add=(items:unknown[])=>new Promise<void>((resolve,reject)=>{const tx=db.transaction(['projects','favorites'],'readwrite');for(const p of items)tx.objectStore('projects').add(p);for(const f of favorites)tx.objectStore('favorites').add(f);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('The import could not be saved. Existing artwork was not replaced.',{cause:tx.error}));});
 try{await add(projects);}catch(error){if(!mayRetryBinary(error))throw error;await add(await Promise.all(projects.map(packProject)));}
}

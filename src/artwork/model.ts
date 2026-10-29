import type {Project,Favorite} from '../studio/model';
export type ItemKey=`project:${string}`|`favorite:${string}`;
export type WorkStatus='idea'|'in-progress'|'finished';
export interface Board {id:string;name:string;description:string;color:string;icon:string;createdAt:number;updatedAt:number;order:number;pinned:boolean;archivedAt?:number;cover?:ItemKey}
export interface ItemMeta {boards:string[];notes:string;tags:string[];status:WorkStatus;priority:'low'|'normal'|'high';rating:number;starred:boolean;order:number;lastOpenedAt?:number;archivedAt?:number;trashedAt?:number}
export interface LibraryData {boards:Board[];items:Record<string,ItemMeta>}
export interface Preferences {layout:'masonry'|'grid'|'list';density:'small'|'medium'|'large';showDates:boolean;showNotes:boolean;showTags:boolean;showDetails:boolean;showBadges:boolean;showTitles:boolean;boardSort:'manual'|'name'|'newest'|'count';theme:'cream'|'white'|'peach';sort:SortKey;group:'none'|'status'|'kind'|'month'}
export interface LibraryState extends LibraryData {id:'library';version:1;revision:number;preferences:Preferences;past:LibraryData[];future:LibraryData[];lastBackupAt?:number}
export const DEFAULT_PREFERENCES:Preferences={layout:'masonry',density:'medium',showDates:true,showNotes:false,showTags:true,showDetails:false,showBadges:true,showTitles:true,boardSort:'manual',theme:'cream',sort:'updated-desc',group:'none'};
export function emptyLibrary():LibraryState{return{id:'library',version:1,revision:0,boards:[],items:{},preferences:{...DEFAULT_PREFERENCES},past:[],future:[]};}
export const BOARD_COLORS=['#f47b3e','#efb83e','#7ca56c','#66aeb5','#a487bd','#d48390','#a18469','#686f83'];
export const BOARD_ICONS=['all','animals','flowers','fantasy','mandalas','ocean','space','food','vehicles','birds','pets','woodland'];
export function defaultMeta():ItemMeta{return{boards:[],notes:'',tags:[],status:'idea',priority:'normal',rating:0,starred:false,order:0};}
export function metaFor(state:LibraryData,key:string):ItemMeta{return state.items[key]||defaultMeta();}
export function cleanTags(value:string|string[]){return [...new Set((typeof value==='string'?value.split(','):value).map(t=>t.trim().normalize('NFKC').slice(0,32)).filter(Boolean))].slice(0,20);}
export function snapshot(state:LibraryData):LibraryData{return structuredClone({boards:state.boards,items:state.items});}
export function changeLibrary(state:LibraryState,edit:(data:LibraryState)=>void,history=true){if(history){state.past.push(snapshot(state));if(state.past.length>25)state.past.shift();state.future=[];}edit(state);state.revision++;return state;}
export function undoLibrary(state:LibraryState){const previous=state.past.pop();if(!previous)return false;state.future.push(snapshot(state));Object.assign(state,previous);state.revision++;return true;}
export function redoLibrary(state:LibraryState){const next=state.future.pop();if(!next)return false;state.past.push(snapshot(state));Object.assign(state,next);state.revision++;return true;}
export interface LibraryItem {key:ItemKey;id:string;kind:'project'|'favorite';title:string;createdAt:number;updatedAt:number;bytes:number;width:number;height:number;painted:boolean;project?:Project;favorite?:Favorite}
export function libraryItems(projects:Project[],favorites:Favorite[]):LibraryItem[]{return [...projects.map(p=>({key:`project:${p.id}` as ItemKey,id:p.id,kind:'project' as const,title:p.title,createdAt:p.createdAt,updatedAt:p.updatedAt,bytes:p.source.blob.size+(p.thumbnail?.size||0),width:p.source.width,height:p.source.height,painted:p.layers.some(l=>l.operations.length>0)||p.texts.length>0||(p.objects||[]).length>0,project:p})),...favorites.map(f=>({key:`favorite:${f.id}` as ItemKey,id:f.id,kind:'favorite' as const,title:f.title,createdAt:f.savedAt,updatedAt:f.savedAt,bytes:0,width:0,height:0,painted:false,favorite:f}))];}
export type SortKey='updated-desc'|'updated-asc'|'created-desc'|'created-asc'|'title-asc'|'title-desc'|'opened-desc'|'rating-desc'|'size-desc'|'size-asc'|'manual'|'tags-desc';
export interface Filters {scope:string;q:string;kind:string;status:string;priority:string;tag:string;rating:number;notes:string;orientation:string;painted:string;period:string;from:string;to:string;sort:SortKey;seed:number}
export const DEFAULT_FILTERS:Filters={scope:'all',q:'',kind:'all',status:'all',priority:'all',tag:'',rating:0,notes:'all',orientation:'all',painted:'all',period:'all',from:'',to:'',sort:'updated-desc',seed:0};
export function filterItems(items:LibraryItem[],state:LibraryData,f:Filters,now=Date.now()){
 const term=f.q.trim().normalize('NFKC').toLocaleLowerCase('en-US'),tokens=term.split(/\s+/).filter(Boolean);const today=new Date(now);today.setHours(0,0,0,0);
 const results=items.filter(item=>{const m=metaFor(state,item.key),scope=f.scope;
  if(scope==='trash'){if(!m.trashedAt)return false;}else if(m.trashedAt)return false;
  if(scope==='archived'){if(!m.archivedAt)return false;}else if(scope!=='trash'&&m.archivedAt)return false;
  if(scope==='projects'&&item.kind!=='project'||scope==='favorites'&&item.kind!=='favorite'||scope==='starred'&&!m.starred||scope==='unfiled'&&m.boards.length)return false;
  if(scope.startsWith('board:')&&!m.boards.includes(scope.slice(6)))return false;
  if(['idea','in-progress','finished'].includes(scope)&&m.status!==scope)return false;
  if(scope==='recent'&&(!m.lastOpenedAt||m.lastOpenedAt<now-7*86400000))return false;
  if(f.kind!=='all'&&f.kind!==item.kind||f.status!=='all'&&m.status!==f.status||f.priority!=='all'&&m.priority!==f.priority||f.rating>m.rating)return false;
  if(f.tag&&!m.tags.includes(f.tag)||f.notes==='with'&&!m.notes||f.notes==='without'&&m.notes)return false;
  if(f.painted==='colored'&&!item.painted||f.painted==='blank'&&(item.kind!=='project'||item.painted))return false;
  if(f.orientation!=='all'){if(!item.width)return false;const o=item.width===item.height?'square':item.width>item.height?'landscape':'portrait';if(o!==f.orientation)return false;}
  const since=f.period==='today'?today.getTime():f.period==='week'?now-7*86400000:f.period==='month'?now-30*86400000:f.period==='year'?now-365*86400000:0;if(since&&item.updatedAt<since)return false;
  if(f.from&&item.updatedAt<new Date(f.from+'T00:00:00').getTime()||f.to&&item.updatedAt>new Date(f.to+'T23:59:59').getTime())return false;
  const hay=[item.title,m.notes,...m.tags,...m.boards.map(id=>state.boards.find(b=>b.id===id)?.name||'')].join(' ').normalize('NFKC').toLocaleLowerCase('en-US');return tokens.every(t=>hay.includes(t));
 });
 return results.sort((a,b)=>{const am=metaFor(state,a.key),bm=metaFor(state,b.key);let n=0;switch(f.sort){case'updated-desc':n=b.updatedAt-a.updatedAt;break;case'updated-asc':n=a.updatedAt-b.updatedAt;break;case'created-desc':n=b.createdAt-a.createdAt;break;case'created-asc':n=a.createdAt-b.createdAt;break;case'title-asc':n=a.title.localeCompare(b.title);break;case'title-desc':n=b.title.localeCompare(a.title);break;case'opened-desc':n=(bm.lastOpenedAt||0)-(am.lastOpenedAt||0);break;case'rating-desc':n=bm.rating-am.rating;break;case'size-desc':n=b.bytes-a.bytes;break;case'size-asc':n=a.bytes-b.bytes;break;case'tags-desc':n=bm.tags.length-am.tags.length;break;case'manual':n=am.order-bm.order;break;}return n||a.key.localeCompare(b.key);});
}
export function validateLibraryData(input:unknown):LibraryData{
 if(!input||typeof input!=='object')throw new Error('Invalid library metadata.');const data=input as LibraryData;
 if(!Array.isArray(data.boards)||data.boards.length>200||!data.items||typeof data.items!=='object'||Array.isArray(data.items)||Object.keys(data.items).length>10000)throw new Error('Library metadata exceeds its limits.');
 const seen=new Set<string>();const boards=data.boards.map(b=>{if(!b||typeof b.id!=='string'||!/^[a-zA-Z0-9_-]{1,160}$/.test(b.id)||seen.has(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>80)throw new Error('Invalid board.');seen.add(b.id);return{id:b.id,name:b.name,description:String(b.description||'').slice(0,500),color:BOARD_COLORS.includes(b.color)?b.color:BOARD_COLORS[0],icon:BOARD_ICONS.includes(b.icon)?b.icon:'all',createdAt:Number.isFinite(b.createdAt)?b.createdAt:Date.now(),updatedAt:Number.isFinite(b.updatedAt)?b.updatedAt:Date.now(),order:Number.isFinite(b.order)?b.order:0,pinned:!!b.pinned,...(b.archivedAt?{archivedAt:Number(b.archivedAt)}:{}),...(typeof b.cover==='string'?{cover:b.cover}:{})};});
 const entries:Record<string,ItemMeta>=Object.create(null);for(const [key,m]of Object.entries(data.items)){if(!/^(project|favorite):[a-zA-Z0-9_-]{1,160}$/.test(key)||!m||typeof m!=='object')throw new Error('Invalid artwork metadata.');entries[key]={...defaultMeta(),boards:Array.isArray(m.boards)?[...new Set(m.boards.filter(id=>typeof id==='string'&&seen.has(id)))]:[],notes:typeof m.notes==='string'?m.notes.slice(0,2000):'',tags:cleanTags(Array.isArray(m.tags)?m.tags.filter(x=>typeof x==='string'):[]),status:['idea','in-progress','finished'].includes(m.status)?m.status:'idea',priority:['low','normal','high'].includes(m.priority)?m.priority:'normal',rating:Number.isInteger(m.rating)&&m.rating>=0&&m.rating<=5?m.rating:0,starred:!!m.starred,order:Number.isFinite(m.order)?m.order:0,...(Number.isFinite(m.lastOpenedAt)?{lastOpenedAt:m.lastOpenedAt}:{}),...(Number.isFinite(m.archivedAt)?{archivedAt:m.archivedAt}:{}),...(Number.isFinite(m.trashedAt)?{trashedAt:m.trashedAt}:{})};}
 return{boards,items:entries};
}

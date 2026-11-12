import {publicCatalogDatabase} from './catalog-reads';
import {navigationCollection,collectionForRoot,collectionPath} from '../taxonomy/navigation';
import {categoryById} from '../taxonomy/catalog';
import {numberTopic,canonicalNumberSubject,searchNumberSubject} from '../taxonomy/number-topics';
import {numberSubjects} from '../search/number-subjects';
import {displayCopies} from './responsive-assets';
import {difficultyForScore,searchDifficultyValues,catalogReviewSeed,scopedCatalogReviewFilter,searchDifficultySQL} from '../age/difficulty';
import {parseSearchIntent,intentWords,intentExpression,equivalents,correctionFor,commonSearchTerms,wordCandidates,compactModelParts,SEARCH_VERSION,type SearchMatch} from '../search/intent';
import {ageBand,type AgeBand} from '../age/model';
import type {Asset,CatalogPage,CatalogQuery,Content,Database,Env} from './types';
import {AppError,canonicalJSON,sha256} from './http';
import {displayTitle} from '../ui/titles';
import {collectionDefinitions,rankCollections,subjectFocus,collectionTopics,type CollectionDiscovery} from '../content/collection-matching';
import {canonicalSubject} from '../search/intent';
import {collectionScope,collectionCountCandidates} from './collection-scope';
import {searchTopicIds,withTopicExpression,topicSearchVocabulary,containsSearchTopicIdentity} from '../search/topics';
import {candidateTags,candidateTagWeight,rankRelated,collectionOverview,type RelatedResult} from '../content/related';
export type {Content,CatalogPage,CatalogQuery} from './types';
export interface CatalogRepository {list(query?:CatalogQuery):Promise<CatalogPage>;get(idOrSlug:string):Promise<Content|null>;getMany(keys:string[]):Promise<(Content|null)[]>;categoryCover(category?:string):Promise<Content|null>;categoryCovers(categories:string[]):Promise<(Content|null)[]>;related(source:Content):Promise<RelatedResult>;relatedCollections(query:CatalogQuery,page:CatalogPage):Promise<CollectionDiscovery>;categories():Promise<{id:string;name:string;parent_id:string|null;count:number}[]>;redirect(slug:string):Promise<string|null>}
export interface SearchProvider {search(q:string,limit?:number,options?:CatalogQuery):Promise<{ids:string[];total:number;has_more:boolean;next_cursor:string|null;search_match?:SearchMatch}>;project(document:SearchDocument):Promise<void>}
export interface SearchDocument {description?:string;alt_text?:string;recommended_age?:AgeBand;id:string;source_version:number;visibility:string;locale:string;title:string;tags:string;categories:string;updated_at:string;age_groups?:string[];category_ids?:string[];difficulty?:string|null;published_at?:string;sort_score?:number;has_home_color?:boolean}
export function normalizeSearch(q:string){return q.normalize('NFKC').trim().replace(/\s+/g,' ').slice(0,160)}
export function ftsQuery(q:string){return normalizeSearch(q).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0,12).map(word=>'"'+word.replace(/"/g,'""')+'"*').join(' AND ')}
export class D1SearchProvider implements SearchProvider{
 constructor(private db:Database,private secret?:string){}
 async search(text:string,limit=48,options:CatalogQuery={}){
 const query=normalizeSearch(text);let intent=parseSearchIntent(query);
 // A real artwork title containing “Detailed” or an age must remain a title,
 // rather than silently acquiring a conflicting inferred difficulty/age filter.
 if(intent.ages.length||intent.bands.length||intent.difficulty.length){
  const literal=intentWords(query);
  if(literal.length&&await this.db.prepare("SELECT 1 FROM search_fts JOIN search_document d ON d.rowid=search_fts.rowid WHERE search_fts MATCH ? AND lower(d.title)=? AND d.visibility='published' LIMIT 1").bind(intentExpression(literal),query.toLowerCase()).first())intent={words:literal,ages:[],bands:[],difficulty:[]};
 }
 const words=intent.words,hasWords=words.length>0;if(!hasWords&&!intent.ages.length&&!intent.bands.length&&!intent.difficulty.length)return{ids:[],total:0,has_more:false,next_cursor:null,search_match:{mode:'none' as const,query,interpreted:''}};
 limit=Math.min(48,Math.max(1,limit));const sort=options.sort||'trending',page=Math.min(100,Math.max(1,options.page||1));
 const candidates=[...new Set(words.flatMap(word=>[...wordCandidates(word),...compactModelParts(word)]))],knownRows=hasWords?await this.db.prepare('SELECT term FROM search_terms WHERE term IN (SELECT value FROM json_each(?))').bind(JSON.stringify(candidates)).all<{term:string}>():{results:[]},known=new Set(knownRows.results.map(r=>r.term));
 let chosen=words.flatMap(word=>{const parts=compactModelParts(word);return!known.has(word)&&parts.length>1&&parts.every(part=>known.has(part))?parts:[word];}),expression=withTopicExpression(intentExpression(chosen,known),chosen.join(' '),known),mode:SearchMatch['mode']=chosen.join(' ')!==words.join(' ')||words.some(w=>equivalents(w).length>1)?'related-words':'direct';
 const scopes=["d.visibility='published'"],scopeValues:unknown[]=[];
 if(options.collection){const roots=navigationCollection(options.collection)?.roots;if(!roots)throw new AppError('VALIDATION_ERROR','Unknown collection.');scopes.push('EXISTS(SELECT 1 FROM json_each(d.category_ids) WHERE value IN (SELECT value FROM json_each(?)))');scopeValues.push(JSON.stringify(roots));}
 if(options.number){if(!numberTopic(options.number))throw new AppError('VALIDATION_ERROR','Unknown number topic.');scopes.push("EXISTS(SELECT 1 FROM json_each(d.category_ids) WHERE value='numbers') AND ("+searchNumberSubject()+')=?');scopeValues.push(options.number);}
 if(options.marketingOnly)scopes.push('d.has_home_color=1');if(options.recommended_age){scopes.push('d.recommended_age=?');scopeValues.push(options.recommended_age);}for(const c of [options.category,options.subcategory])if(c){scopes.push('EXISTS(SELECT 1 FROM json_each(d.category_ids) WHERE value=?)');scopeValues.push(c);}if(options.age?.length){scopes.push(`EXISTS(SELECT 1 FROM json_each(d.age_groups) WHERE value IN (${options.age.map(()=>'?').join(',')}))`);scopeValues.push(...options.age);}if(options.difficulty?.length){const levels=searchDifficultyValues(options.difficulty);scopes.push(`(${searchDifficultySQL()}) IN (${levels.map(()=>'?').join(',')})`);scopeValues.push(...levels);}
 for(const age of intent.ages){scopes.push('EXISTS(SELECT 1 FROM json_each(d.age_groups) WHERE value=?)');scopeValues.push(age);}if(intent.bands.length){scopes.push(`d.recommended_age IN (${intent.bands.map(()=>'?').join(',')})`);scopeValues.push(...intent.bands);}for(const difficulty of intent.difficulty){const levels=searchDifficultyValues([difficulty]);scopes.push(`(${searchDifficultySQL()}) IN (${levels.map(()=>'?').join(',')})`);scopeValues.push(...levels);}
 // A unique numeric tag in the reviewed Numbers metadata supplies an
 // explicit subject when a scene-specific title omits the word “number”.
 // Ambiguous arithmetic/count tags cannot override the exact title phrase.
 const numericTags="json_each('['||replace(json_quote(trim(d.tags)),' ','\",\"')||']')";
 const numericTagFilter="value GLOB '[0-9]*' AND value NOT GLOB '*[^0-9]*'";
 const numberScope=()=>numberSubjects(chosen).map(subject=>({
  sql:"(d.rowid IN (SELECT rowid FROM search_fts WHERE search_fts MATCH ?) OR (EXISTS(SELECT 1 FROM json_each(d.category_ids) WHERE value='numbers') AND (SELECT COUNT(*) FROM "+numericTags+" WHERE "+numericTagFilter+")=1 AND EXISTS(SELECT 1 FROM "+numericTags+" WHERE "+numericTagFilter+" AND value=?)))",
  values:[subject.titleExpression,String(subject.number)]
 }));
 const from=()=> (hasWords?' FROM search_fts JOIN search_document d ON d.rowid=search_fts.rowid WHERE search_fts MATCH ? AND ':' FROM search_document d WHERE ')+[...scopes,...numberScope().map(scope=>scope.sql)].join(' AND ');
 const boundScopes=()=>[...scopeValues,...numberScope().flatMap(scope=>scope.values)];
 const count=async()=>((await this.db.prepare('SELECT COUNT(*) AS total'+from()).bind(...(hasWords?[expression,...boundScopes()]:boundScopes())).first<{total:number}>())?.total||0);
 let total=await count();
 if(!total){
  const unknown=[...new Set(chosen.filter(word=>!known.has(word)&&word.length>=4&&!/^\d+$/.test(word)))];
  // At most two bounded vocabulary reads, even for a long failed query. Never
  // retry each word separately or broaden a missing model into the whole brand.
  if(unknown.length&&unknown.length<=4){
   const prefixes=[...new Set(unknown.map(word=>word.slice(0,2)))];
   const [near,common]=await Promise.all([
    this.db.prepare(prefixes.map(()=>'(SELECT term,doc FROM search_terms WHERE term>=? AND term<? LIMIT 128)').map(sql=>'SELECT * FROM '+sql).join(' UNION ALL ')).bind(...prefixes.flatMap(prefix=>[prefix,prefix+'\uffff'])).all<{term:string;doc:number}>(),
    this.db.prepare('SELECT term,doc FROM search_terms WHERE term IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...commonSearchTerms,...topicSearchVocabulary])).all<{term:string;doc:number}>()
   ]);
   let changed=false;for(let i=0;i<chosen.length;i++){if(!unknown.includes(chosen[i]))continue;const fixed=correctionFor(chosen[i],[...near.results,...common.results]);if(fixed){chosen[i]=fixed;changed=true;}}
   if(changed){expression=withTopicExpression(intentExpression(chosen,new Set(chosen)),chosen.join(' '),new Set(chosen));total=await count();if(total)mode='corrected';}
  }
 }
 if(!total&&options.cursor)throw new AppError('INVALID_CURSOR','These search results changed. Start from the first page.');
 if(!total)return{ids:[],total:0,has_more:false,next_cursor:null,search_match:{mode:'none' as const,query,interpreted:words.join(' ')}};
 const phrase=hasWords?chosen.join(' '):query,categoryTerms=searchTopicIds(phrase),match:SearchMatch={mode,query,interpreted:phrase};
 // Recognized topic and numeral searches have explicit subject identity.
 // Corpus-wide BM25 changes as unrelated drawings publish, moving existing
 // members across cursor boundaries. Keep literal-title/category boosts and
 // the stable ID tie-break for these queries; free-text searches retain BM25.
 const lexicalRank=numberSubjects(chosen).length||containsSearchTopicIdentity(chosen)?'0':'-bm25(search_fts,0,16,8,22,1,.6)*1000';
 const cte="WITH matched AS MATERIALIZED (SELECT d.id,d.title,d.published_at,d.sort_score,"+(hasWords?"CASE WHEN lower(d.title)=? THEN 100000 WHEN instr(lower(d.title),?)=1 THEN 10000 ELSE 0 END+CASE WHEN instr(' '||lower(replace(d.title,'-',' '))||' ',?)>0 THEN 20000 ELSE 0 END+CASE WHEN EXISTS(SELECT 1 FROM json_each(d.category_ids) cat JOIN json_each(?) term ON cat.value=term.value) THEN 80000 ELSE 0 END+"+lexicalRank:'d.sort_score')+" AS relevance"+from()+')';
 const column=sort==='newest'?'published_at':sort==='title'?'title COLLATE NOCASE':'relevance',direction=sort==='title'?'ASC':'DESC',compare=sort==='title'?'>':'<',fingerprint=await sha256(canonicalJSON({...options,q:query,interpreted:phrase,version:SEARCH_VERSION,limit,page:undefined,cursor:undefined}));const where:string[]=[],values:unknown[]=hasWords?[phrase,phrase, ' '+phrase+' ',JSON.stringify(categoryTerms),expression,...boundScopes()]:boundScopes();
 if(options.cursor){if(!this.secret)throw new AppError('CURSOR_UNAVAILABLE','Cursor signing is not configured.',503);try{const [payload,sig]=options.cursor.split('.');if(!payload||!sig||sig!==await signCursor(payload,this.secret))throw new Error();const c=JSON.parse(decode(payload)) as Cursor;if(c.query!==fingerprint||c.sort!==sort||c.exp<Date.now())throw new Error();where.push(`(${column} ${compare} ? OR (${column}=? AND id ${compare} ?))`);values.push(c.value,c.value,c.id);}catch{throw new AppError('INVALID_CURSOR','This search cursor is invalid or expired.');}}
 const result=await this.db.prepare(cte+' SELECT * FROM matched'+(where.length?' WHERE '+where.join(' AND '):'')+` ORDER BY ${column} ${direction},id ${direction} LIMIT ? OFFSET ?`).bind(...values,limit+1,options.cursor?0:(page-1)*limit).all<{id:string;title:string;published_at:string;sort_score:number;relevance:number}>(),rows=result.results.slice(0,limit),hasMore=result.results.length>limit;let cursor:string|null=null;
 if(hasMore&&rows.length&&this.secret){const last=rows.at(-1)!,payload=encode(JSON.stringify({query:fingerprint,sort,value:sort==='newest'?last.published_at:sort==='title'?last.title:last.relevance,id:last.id,exp:Date.now()+86400000}));cursor=payload+'.'+await signCursor(payload,this.secret);}return{ids:rows.map(r=>r.id),total,has_more:hasMore,next_cursor:cursor,search_match:match};
 }
 async project(d:SearchDocument){await this.db.prepare('INSERT INTO search_document(id,source_version,visibility,locale,title,tags,categories,updated_at,age_groups,category_ids,difficulty,published_at,sort_score,has_home_color,recommended_age,description,alt_text) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET source_version=excluded.source_version,visibility=excluded.visibility,locale=excluded.locale,title=excluded.title,tags=excluded.tags,categories=excluded.categories,updated_at=excluded.updated_at,age_groups=excluded.age_groups,category_ids=excluded.category_ids,difficulty=excluded.difficulty,published_at=excluded.published_at,sort_score=excluded.sort_score,has_home_color=excluded.has_home_color,recommended_age=excluded.recommended_age,description=excluded.description,alt_text=excluded.alt_text WHERE excluded.source_version>search_document.source_version').bind(d.id,d.source_version,d.visibility,d.locale,d.title,d.tags,d.categories,d.updated_at,JSON.stringify(d.age_groups||[]),JSON.stringify(d.category_ids||d.categories.split(' ')),d.difficulty||null,d.published_at||d.updated_at,d.sort_score||0,Number(!!d.has_home_color),d.recommended_age||null,d.description||'',d.alt_text||'').run()}
}
export function parseCatalogQuery(params:URLSearchParams):CatalogQuery {const page=Number(params.get('page')||1),limit=Number(params.get('limit')||8);if(!Number.isSafeInteger(page)||page<1||page>100||!Number.isSafeInteger(limit)||limit<1||limit>48)throw new AppError('VALIDATION_ERROR','Page must be 1–100 and page size 1–48. Use cursor pagination beyond this window.');const recommended=params.get('recommended_age')||undefined;if(recommended&&!ageBand(recommended))throw new AppError('VALIDATION_ERROR','Unknown recommended age.');const sort=params.get('sort')||'trending';if(!['trending','newest','title'].includes(sort))throw new AppError('VALIDATION_ERROR','Unknown sort option.');const age=params.getAll('age').flatMap(x=>x.split(',')).filter(Boolean),difficulty=params.getAll('difficulty').flatMap(x=>x.split(',')).filter(Boolean);if(age.some(x=>!['kids','teens','adults'].includes(x))||difficulty.some(x=>!['easy','medium','hard','very-hard','detailed'].includes(x)))throw new AppError('VALIDATION_ERROR','Unknown filter.');const category=params.get('category')||undefined,subcategory=params.get('subcategory')||undefined;for(const c of [category,subcategory])if(c&&!/^[a-z0-9-]{1,128}$/.test(c))throw new AppError('VALIDATION_ERROR','Invalid category.');const marketing=params.get('marketingOnly');if(marketing&&!['true','false'].includes(marketing))throw new AppError('VALIDATION_ERROR','Invalid marketing filter.');const collection=params.get('collection')||undefined,number=params.get('number')||undefined;if(collection&&!navigationCollection(collection)||number&&!numberTopic(number))throw new AppError('VALIDATION_ERROR','Unknown collection or number topic.');return {collection,number,recommended_age:recommended as AgeBand|undefined,marketingOnly:marketing==='true',q:normalizeSearch(params.get('q')||''),category,subcategory,age:[...new Set(age)].sort(),difficulty:[...new Set(difficulty)].sort(),sort:sort as CatalogQuery['sort'],page,limit,cursor:params.get('cursor')||undefined}}
const rowColumns=(prefix='')=>['id','slug','locale','title','description','alt_text','active_version','published_at','sort_score','difficulty','example_only'].map(column=>prefix+column).join(',');
// These SQLite indexes are the immutable id PK and unique slug from 0001.
// Avoid a status-index table scan when the exact IDs are already known.
interface Row {id:string;slug:string;locale:string;title:string;description:string;alt_text:string;active_version:number;published_at:string;sort_score:number;difficulty:string|null;example_only:number}
interface Cursor {query:string;sort:string;value:string|number;id:string;exp:number}
const textEncoder=new TextEncoder();
async function signCursor(data:string,secret:string){const key=await crypto.subtle.importKey('raw',textEncoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,textEncoder.encode(data))))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function encode(data:string){return btoa(String.fromCharCode(...new TextEncoder().encode(data))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','')}
function decode(data:string){return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(data.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0)))}
export class D1CatalogRepository implements CatalogRepository{
 constructor(private env:Env,private db:Database,private search?:SearchProvider){}
 private assetURL(asset:Asset,id:string){const base=this.env.PUBLIC_MEDIA_BASE_URL?.replace(/\/$/,'');return base?`${base}/${asset.object_key.split('/').map(encodeURIComponent).join('/')}`:`/api/media/${encodeURIComponent(id)}/${asset.role}?v=${asset.sha256.slice(0,24)}`}
 private async hydrate(rows:Row[]):Promise<Content[]>{if(!rows.length)return [];const ids=rows.map(r=>r.id),marks=ids.map(()=>'?').join(',');const [assets,categories,tags,ages,recommendations]=await Promise.all([this.db.prepare(`SELECT a.*,ar.review_version,json_extract(cr.manifest_json,'$.color_preview_policy') AS color_preview_policy FROM asset a LEFT JOIN asset_review ar ON ar.sha256=a.sha256 AND ar.role=a.role JOIN content c ON c.id=a.content_id AND c.active_version=a.content_version LEFT JOIN content_revision cr ON cr.content_id=c.id AND cr.version=c.active_version WHERE a.content_id IN (${marks}) AND a.verified=1`).bind(...ids).all<Asset&{content_id:string;review_version:number;color_preview_policy?:'automatic'|'none'}>(),this.db.prepare(`SELECT cc.content_id,c.id,c.name,c.parent_id FROM content_category cc JOIN category c ON c.id=cc.category_id WHERE cc.content_id IN (${marks}) ORDER BY cc.position,c.parent_id IS NOT NULL,c.sort_order,c.id`).bind(...ids).all<{content_id:string;id:string;name:string;parent_id:string|null}>(),this.db.prepare(`SELECT content_id,tag FROM content_tag WHERE content_id IN (${marks})`).bind(...ids).all<{content_id:string;tag:string}>(),this.db.prepare(`SELECT content_id,age FROM content_age WHERE content_id IN (${marks})`).bind(...ids).all<{content_id:string;age:string}>(),this.db.prepare(`SELECT ar.content_id,ar.band,ar.score_hundredths/100.0 AS score FROM age_recommendation ar JOIN content c ON c.id=ar.content_id AND c.active_version=ar.content_version JOIN asset a ON a.content_id=ar.content_id AND a.content_version=ar.content_version AND a.role='printable_webp_bw' AND a.sha256=ar.source_sha256 WHERE ar.content_id IN (${marks})`).bind(...ids).all<{content_id:string;band:AgeBand;score:number}>()]);return rows.map(r=>{const media=assets.results.filter(a=>a.content_id===r.id);const byRole=(role:string)=>media.find(a=>a.role===role);const url=(role:string)=>{const a=byRole(role);return a?this.assetURL(a,r.id):''};const srcset=(roles:string[])=>roles.flatMap(role=>{const a=byRole(role);if(!a?.width)return [];return [{width:a.width,url:this.assetURL(a,r.id)},...displayCopies(a.sha256,a.role).map(copy=>({width:copy.width,url:this.env.PUBLIC_MEDIA_BASE_URL?this.env.PUBLIC_MEDIA_BASE_URL.replace(/\/$/,'')+'/'+copy.key:`/api/media/${encodeURIComponent(r.id)}/${a.role}?v=${a.sha256.slice(0,24)}&display=${copy.width}`}))]}).sort((a,b)=>a.width-b.width).filter((a,i,all)=>all.findLastIndex(other=>other.width===a.width)===i).map(a=>`${a.url} ${a.width}w`).join(',');const download=(role:string,format:string)=>{const a=byRole(role);return `/api/download/${r.id}/${format}`+(a?'?v='+a.sha256.slice(0,24):'')};const cats=categories.results.filter(c=>c.content_id===r.id);const main=cats.find(c=>!c.parent_id)||cats[0];const original=byRole('printable_webp_bw');return {color_preview_policy:original?.color_preview_policy,recommendedAge:recommendations.results.find(a=>a.content_id===r.id),id:r.id,slug:r.slug,title:displayTitle(r.title),description:r.description,alt:r.alt_text?.trim()||r.description?.trim()||r.title,category:main?.id||'',categoryName:main?.name||'',subcategory:cats.find(c=>c.parent_id)?.id||null,category_ids:cats.map(c=>c.id),tags:tags.results.filter(t=>t.content_id===r.id).map(t=>t.tag),age_groups:ages.results.filter(a=>a.content_id===r.id).map(a=>a.age),difficulty:recommendations.results.find(a=>a.content_id===r.id)?difficultyForScore(recommendations.results.find(a=>a.content_id===r.id)!.score):r.difficulty==='easy'?'easy':'hard',version:r.active_version,revision:r.active_version,thumbnail:url('catalog_thumb_bw'),thumbnailSrcset:srcset(['catalog_thumb_small_bw','catalog_thumb_medium_bw','catalog_thumb_bw']),preview:url('catalog_preview_bw'),previewSrcset:srcset(['catalog_thumb_small_bw','catalog_thumb_medium_bw','catalog_thumb_bw','catalog_preview_mobile_bw','catalog_preview_bw']),homeColorSrcset:srcset(['home_half_color_small','home_half_color_medium','home_half_color']),home_color:url('home_half_color')||null,color_reference:url('color_inspiration')||null,social_image:byRole('social_og')?(this.env.PUBLIC_MEDIA_BASE_URL?url('social_og'):`/og/coloring/${r.slug}.png?v=${byRole('social_og')!.sha256.slice(0,24)}`):null,downloads:{pdf:download('printable_pdf_a4_bw','pdf'),webp:download('printable_webp_bw','webp'),...(byRole('printable_pdf_letter_bw')?{letter:download('printable_pdf_letter_bw','letter')}:{})},published_at:r.published_at,lineArtUrl:url('printable_webp_bw'),width:original?.width||0,height:original?.height||0,hasBrandFooter:(original?.review_version||0)>=2,example_only:!!r.example_only,downloadMetadata:{pdfBytes:byRole('printable_pdf_a4_bw')?.bytes||0,webpBytes:original?.bytes||0}}})}
 async getMany(keys:string[]){
  if(keys.length>40)throw new AppError('VALIDATION_ERROR','Request up to 40 sample pages.');
  if(!keys.length)return[];const unique=[...new Set(keys)],marks=unique.map(()=>'?').join(',');
  const rows=await this.db.prepare(`SELECT ${rowColumns()} FROM content INDEXED BY sqlite_autoindex_content_1 WHERE id IN (${marks}) AND status='published' AND active_version IS NOT NULL UNION SELECT ${rowColumns()} FROM content INDEXED BY sqlite_autoindex_content_2 WHERE slug IN (${marks}) AND status='published' AND active_version IS NOT NULL`).bind(...unique,...unique).all<Row>();
  const items=await this.hydrate(rows.results);
  return keys.map(key=>items.find(item=>item.id===key)||items.find(item=>item.slug===key)||null);
 }
 async get(idOrSlug:string){return(await this.getMany([idOrSlug]))[0]||null;}
 /** Select only a published, verified thumbnail from each exact collection. */
 async categoryCovers(categories:string[]){
  if(categories.length>40)throw new AppError('VALIDATION_ERROR','Request up to 40 collection covers.');
  if(!categories.length)return [];
  // Each correlated lookup walks the category index in ID order and stops at the first eligible image.
  const rows=await this.db.prepare(`SELECT j.key AS position,(SELECT c.id FROM content_category cc INDEXED BY category_content JOIN content c ON c.id=cc.content_id JOIN asset a ON a.content_id=c.id AND a.content_version=c.active_version AND a.role='catalog_thumb_bw' AND a.verified=1 WHERE cc.category_id=j.value AND c.status='published' AND c.active_version IS NOT NULL AND c.example_only=0 ORDER BY cc.content_id LIMIT 1) AS id FROM json_each(?) j ORDER BY CAST(j.key AS INTEGER)`).bind(JSON.stringify(categories)).all<{position:number;id:string|null}>();
  const keys=rows.results.map(row=>row.id||'');return this.getMany(keys);
 }
 /** Cover choice is deterministic and independent of search, pagination, or other page filters. */
 async categoryCover(category?:string){
  if(category)return (await this.categoryCovers([category]))[0]||null;
  const eligible="c.status='published' AND c.active_version IS NOT NULL AND c.example_only=0";
  const media="JOIN asset a ON a.content_id=c.id AND a.content_version=c.active_version AND a.role='catalog_thumb_bw' AND a.verified=1";
  const statement=this.db.prepare(`SELECT ${rowColumns('c.')} FROM content c ${media} WHERE ${eligible} ORDER BY c.published_at DESC,c.id DESC LIMIT 1`);
  const row=await statement.first<Row>();return row?(await this.hydrate([row]))[0]||null:null;
 }

 async relatedCollections(query:CatalogQuery,page:CatalogPage):Promise<CollectionDiscovery>{
 const scoped=!!query.q||!!query.recommended_age||!!query.age?.length||!!query.difficulty?.length;
 const canonical={...query,page:1,cursor:undefined,sort:'trending' as const,limit:48};
 // Filter results are already authoritative evidence. Do not rerun their image-bound
 // predicates for every taxonomy branch just to render optional recommendations.
 const sourcePage=scoped||page.page===1&&page.total<=page.items.length?page:await this.list(canonical),source=sourcePage.items;
 const definitions=collectionDefinitions(await this.categories()),scope=collectionScope(query);let neighbors:Content[]=[];
 if(!source.length)return {...rankCollections(query,[],[],definitions),topics:[]};
 if(query.q){const globalPage=!query.category&&!query.subcategory?sourcePage:await this.list({...canonical,category:undefined,subcategory:undefined});neighbors=globalPage.items;}
 else if(!scoped&&definitions.length){const branches:string[]=[],values:unknown[]=[];
  // A bounded root sample plus supported subject tags scales independently of the
  // number of imported topics. Leaf-by-leaf filtered sampling overloaded D1.
  const roots=definitions.filter(c=>!c.parent).sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id)).slice(0,12);
  for(const c of roots){branches.push(`SELECT * FROM (SELECT c.id FROM content_category cc JOIN content c ON c.id=cc.content_id WHERE cc.category_id=? AND ${scope.sql} ORDER BY cc.content_id LIMIT 3)`);values.push(c.id,...scope.values);}
  const tags=new Map<string,number>();for(const item of source){const focus=subjectFocus(item);for(const tag of item.tags)if(focus.has(canonicalSubject(tag.toLowerCase())))tags.set(tag,(tags.get(tag)||0)+1);}
  for(const [tag] of [...tags].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,6)){branches.push(`SELECT * FROM (SELECT c.id FROM content_tag ct JOIN content c ON c.id=ct.content_id WHERE ct.tag=? AND ${scope.sql} ORDER BY ct.content_id LIMIT 8)`);values.push(tag,...scope.values);}
  // Stay within D1's bind ceiling even when all age/difficulty facets are selected.
  const sourceIds=new Set(source.map(i=>i.id)),found:{id:string}[]=[];
  for(let offset=0;offset<branches.length;){const max=Math.min(5,Math.max(1,Math.floor(90/(1+scope.values.length)))),batch=branches.slice(offset,offset+max),params=values.slice(offset*(1+scope.values.length),(offset+batch.length)*(1+scope.values.length));found.push(...(await this.db.prepare(batch.join(' UNION ALL ')).bind(...params).all<{id:string}>()).results);offset+=batch.length;}
  const ids=[...new Set(found.map(r=>r.id))].filter(id=>!sourceIds.has(id)).slice(0,80);if(ids.length){const rows=await this.db.prepare(`SELECT ${rowColumns('c.')} FROM content c INDEXED BY sqlite_autoindex_content_1 WHERE c.id IN (${ids.map(()=>'?').join(',')}) AND c.status='published' AND c.active_version IS NOT NULL AND c.example_only=0`).bind(...ids).all<Row>();neighbors=await this.hydrate(rows.results);}
 }
 const result=rankCollections(query,source,neighbors,definitions);result.topics=collectionTopics(source,query,definitions);
 if(scoped&&result.matches.length){
  if(query.q&&this.search){const pinned=sourcePage.search_match?.interpreted||query.q;const counts=await Promise.all(result.matches.map(async m=>({id:m.collection.id,total:(await this.search!.search(pinned,1,{...query,page:1,cursor:undefined,category:m.collection.parent||m.collection.id,subcategory:m.collection.parent?m.collection.id:undefined})).total})));for(const match of result.matches)match.collection.total=counts.find(c=>c.id===match.collection.id)?.total||0;}
  else{
   const candidates=collectionCountCandidates(query);
   const destinations=Object.fromEntries(result.matches.map(m=>[m.collection.id,navigationCollection(m.collection.id)?.roots||[m.collection.id]]));
   // The materialized source check is shared by every displayed destination.
   // Count DISTINCT so a drawing in overlapping roots appears only once, just
   // as it does on that actual collection page. No stale process-local cache.
   const counts=await this.db.prepare(`SELECT * FROM (WITH matching AS MATERIALIZED (SELECT c.id FROM ${candidates.source} WHERE ${candidates.sql}) SELECT g.key AS id,COUNT(DISTINCT m.id) AS total FROM json_each(?) g CROSS JOIN json_each(g.value) root CROSS JOIN content_category cc INDEXED BY category_content ON cc.category_id=root.value JOIN matching m ON m.id=cc.content_id GROUP BY g.key)`).bind(...candidates.values,JSON.stringify(destinations)).all<{id:string;total:number}>();
   for(const match of result.matches)match.collection.total=counts.results.find(c=>c.id===match.collection.id)?.total||0;
  }
  result.matches=result.matches.filter(m=>m.collection.total>0);if(result.mode==='browse')result.matches.sort((a,b)=>b.collection.total-a.collection.total||a.collection.id.localeCompare(b.collection.id));
 }
 const groups=result.matches.map(m=>navigationCollection(m.collection.id)).filter((g):g is NonNullable<typeof g>=>!!g);
 // Count the public groups in one query. Hydrating one full artwork per group
 // solely to obtain its total created dozens of sequential D1 requests.
 const groupTotals=!scoped&&groups.length?(await this.db.prepare(`SELECT g.key AS id,COUNT(DISTINCT c.id) AS total FROM json_each(?) g CROSS JOIN json_each(g.value) root CROSS JOIN content_category cc INDEXED BY category_content ON cc.category_id=root.value CROSS JOIN content c INDEXED BY sqlite_autoindex_content_1 ON c.id=cc.content_id WHERE ${scope.sql} GROUP BY g.key`).bind(JSON.stringify(Object.fromEntries(groups.map(g=>[g.id,g.roots]))),...scope.values).all<{id:string;total:number}>()).results:undefined;
 for(const match of result.matches){const group=navigationCollection(match.collection.id);if(!group)continue;const total=scoped&&!query.q?match.collection.total:groupTotals?groupTotals.find(row=>row.id===group.id)?.total||0:(await this.list({...query,collection:group.id,number:undefined,category:undefined,subcategory:undefined,marketingOnly:undefined,page:1,cursor:undefined,limit:1})).total;match.collection={...match.collection,name:group.name,icon:group.icon,href:collectionPath(group.id),total};}

 if(result.mode==='browse')result.matches.sort((a,b)=>b.collection.total-a.collection.total||a.collection.id.localeCompare(b.collection.id));
 return result;
 }
 async related(source:Content):Promise<RelatedResult>{
 const tags=candidateTags(source),queries:{sql:string;values:unknown[]}[]=[];
 const window=(table:string,column:string,value:string,weight:number,size:number)=>{for(const direction of ['>','<='])queries.push({sql:`SELECT * FROM (SELECT ct.content_id AS id,? AS weight FROM ${table} ct JOIN content c ON c.id=ct.content_id WHERE ct.${column}=? AND ct.content_id ${direction} ? AND c.id<>? AND c.status='published' AND c.active_version IS NOT NULL AND c.example_only=0 ORDER BY ct.content_id ${direction==='>'?'ASC':'DESC'} LIMIT ?)`,values:[weight,value,source.id,source.id,size]});};
 for(const tag of tags)window('content_tag','tag',tag,candidateTagWeight(source,tag),8);
 for(const category of [source.subcategory,source.category].filter((v):v is string=>!!v))window('content_category','category_id',category,category===source.subcategory?12:3,20);
 const scores=new Map<string,number>();
 // Preserve both indexed windows and their exact weights without bursting up
 // to 24 separate reads at D1 for every uncached drawing request.
 for(let offset=0;offset<queries.length;offset+=4){
  const batch=queries.slice(offset,offset+4),rows=await this.db.prepare(batch.map(q=>q.sql).join(' UNION ALL ')).bind(...batch.flatMap(q=>q.values)).all<{id:string;weight:number}>();
  for(const row of rows.results)scores.set(row.id,(scores.get(row.id)||0)+row.weight);
 }
 // Bounded indexed candidate retrieval, then one batch hydration; no full-catalog similarity scan.
 let ids=[...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,80).map(([id])=>id);
 if(ids.length<8){const rows=await this.db.prepare("SELECT id FROM content WHERE status='published' AND active_version IS NOT NULL AND example_only=0 AND id<>? ORDER BY id LIMIT 8").bind(source.id).all<{id:string}>();ids=[...new Set([...ids,...rows.results.map(r=>r.id)])].slice(0,88);}
 const group=collectionForRoot(categoryById(source.category)?.parent||source.category);
 const [rows,collection]=await Promise.all([ids.length?this.db.prepare(`SELECT ${rowColumns()} FROM content INDEXED BY sqlite_autoindex_content_1 WHERE id IN (${ids.map(()=>'?').join(',')}) AND status='published' AND active_version IS NOT NULL AND example_only=0`).bind(...ids).all<Row>():Promise.resolve({results:[] as Row[]}),group?this.db.prepare("SELECT ? AS id,? AS name,COUNT(*) AS count FROM content c INDEXED BY sqlite_autoindex_content_1 WHERE c.status='published' AND c.active_version IS NOT NULL AND c.id IN (SELECT cc.content_id FROM content_category cc WHERE cc.category_id IN (SELECT value FROM json_each(?)))").bind(group.id,group.name,JSON.stringify(group.roots)).first<{id:string;name:string;count:number|null}>():this.db.prepare('SELECT c.id,c.name,n.published_count AS count FROM category c LEFT JOIN category_count n ON n.category_id=c.id WHERE c.id=?').bind(source.category).first<{id:string;name:string;count:number|null}>()]);
 const result=rankRelated(source,await this.hydrate(rows.results));if(collection)result.collection=collectionOverview(source,result.matches.map(m=>m.item),{...collection,...(group?{source_category:source.category,href:collectionPath(group.id)}:{})});return result;
 }
 async redirect(slug:string){const row=await this.db.prepare("SELECT c.slug FROM slug_redirect r JOIN content c ON c.id=r.content_id WHERE r.old_slug=? AND c.status='published'").bind(slug).first<{slug:string}>();return row?.slug||null}
 async categories(){return (await this.db.prepare('SELECT c.id,c.name,c.parent_id,COALESCE(n.published_count,0) AS count FROM category c LEFT JOIN category_count n ON n.category_id=c.id ORDER BY c.sort_order,c.id').all<{id:string;name:string;parent_id:string|null;count:number}>()).results}
 async list(input:CatalogQuery={}):Promise<CatalogPage>{
 const p=new URLSearchParams();for(const [key,value] of Object.entries(input)){if(value===undefined)continue;if(Array.isArray(value))value.forEach(v=>p.append(key,String(v)));else p.set(key,String(value))}const q=parseCatalogQuery(p),limit=q.limit!,page=q.page!,sort=q.sort!;const where=["c.status='published'",'c.active_version IS NOT NULL'];const values:unknown[]=[];if(q.marketingOnly)where.push("EXISTS(SELECT 1 FROM asset ma WHERE ma.content_id=c.id AND ma.content_version=c.active_version AND ma.role='home_half_color' AND ma.verified=1)");
 if(q.collection){const roots=navigationCollection(q.collection)?.roots;if(!roots)throw new AppError('VALIDATION_ERROR','Unknown collection.');where.push('EXISTS(SELECT 1 FROM content_category cc WHERE cc.content_id=c.id AND cc.category_id IN (SELECT value FROM json_each(?)))');values.push(JSON.stringify(roots));}
 if(q.number){if(!numberTopic(q.number))throw new AppError('VALIDATION_ERROR','Unknown number topic.');where.push("EXISTS(SELECT 1 FROM content_category cc WHERE cc.content_id=c.id AND cc.category_id='numbers') AND ("+canonicalNumberSubject()+')=?');values.push(q.number);}
 for(const category of [q.category,q.subcategory])if(category){where.push('EXISTS(SELECT 1 FROM content_category cc WHERE cc.content_id=c.id AND cc.category_id=?)');values.push(category)}
 const reviewSeed=!(q.category||q.subcategory||q.collection||q.number)&&(q.recommended_age||q.difficulty?.length)?catalogReviewSeed(q.difficulty||[],!!q.recommended_age):undefined;
 if((q.category||q.subcategory||q.collection||q.number)&&(q.recommended_age||q.difficulty?.length)){
  where.push(scopedCatalogReviewFilter(q.difficulty||[],!!q.recommended_age));
  if(q.recommended_age)values.push(q.recommended_age);
 }else if(reviewSeed){
  where.push(reviewSeed.sql);if(q.recommended_age)values.push(q.recommended_age);
 }
 if(q.age?.length){where.push(`c.id IN (SELECT ca.content_id FROM content_age ca WHERE ca.age IN (${q.age.map(()=>'?').join(',')}))`);values.push(...q.age)}
 if(q.q){if(!this.search)throw new AppError('SEARCH_UNAVAILABLE','Search is temporarily unavailable.',503);const result=await this.search.search(q.q,limit,q);let rows:Row[]=[];if(result.ids.length){const found=await this.db.prepare(`SELECT ${rowColumns()} FROM content INDEXED BY sqlite_autoindex_content_1 WHERE status='published' AND id IN (${result.ids.map(()=>'?').join(',')})`).bind(...result.ids).all<Row>();rows=result.ids.map(id=>found.results.find(r=>r.id===id)).filter((r):r is Row=>!!r)}return {search_match:result.search_match,items:await this.hydrate(rows),total:result.total,page,page_size:limit,total_pages:Math.ceil(result.total/limit),next_cursor:result.next_cursor,has_more:result.has_more}}
 // Drive scoped galleries from their smallest explicit subject, then validate
 // every other facet against that candidate. Never materialize the whole parent
 // category just to answer a 100-drawing child-topic request.
 const seedCategory=q.subcategory||q.category||(q.number?'numbers':undefined),seedValues:unknown[]=seedCategory?[seedCategory]:q.collection?[JSON.stringify(navigationCollection(q.collection)!.roots)]:[];
 const source=seedCategory?'(SELECT content_id FROM content_category INDEXED BY category_content WHERE category_id=?) seed CROSS JOIN content c INDEXED BY sqlite_autoindex_content_1 ON c.id=seed.content_id':q.collection?'(SELECT DISTINCT cc.content_id FROM json_each(?) root CROSS JOIN content_category cc INDEXED BY category_content ON cc.category_id=root.value) seed CROSS JOIN content c INDEXED BY sqlite_autoindex_content_1 ON c.id=seed.content_id':reviewSeed?.source||'content c';
 const count=await this.db.prepare(`SELECT COUNT(*) AS total FROM ${source} WHERE ${where.join(' AND ')}`).bind(...seedValues,...values).first<{total:number}>();const total=count?.total||0;
 const column=sort==='newest'?'c.published_at':sort==='title'?'c.title COLLATE NOCASE':'c.sort_score';const direction=sort==='title'?'ASC':'DESC';const comparison=sort==='title'?'>':'<';const fingerprint=await sha256(canonicalJSON({...q,cursor:undefined,page:undefined}));
 if(q.cursor){if(!this.env.CURSOR_SIGNING_SECRET)throw new AppError('CURSOR_UNAVAILABLE','Cursor signing is not configured.',503);try{const [payload,sig]=q.cursor.split('.');if(!payload||!sig||sig!==await signCursor(payload,this.env.CURSOR_SIGNING_SECRET))throw new Error();const c=JSON.parse(decode(payload)) as Cursor;if(c.query!==fingerprint||c.sort!==sort||c.exp<Date.now())throw new Error();where.push(`(${column} ${comparison} ? OR (${column} = ? AND c.id ${comparison} ?))`);values.push(c.value,c.value,c.id)}catch{throw new AppError('INVALID_CURSOR','This page cursor is invalid or expired. Start from the first page.')}}
 // Counts walk the matching review range; the visible page instead walks its
 // ordered content index and stops after enough current, source-bound matches.
 // Materializing all matching IDs again defeats LIMIT on every first visit.
 const itemSource=reviewSeed?`content c INDEXED BY ${sort==='newest'?'content_published_date':sort==='title'?'content_published_title':'content_published_score'}`:source;
 const itemWhere=reviewSeed?where.map(clause=>clause===reviewSeed.sql?scopedCatalogReviewFilter(q.difficulty||[],!!q.recommended_age):clause):where;
 const offset=q.cursor?0:(page-1)*limit;const result=await this.db.prepare(`SELECT ${rowColumns('c.')} FROM ${itemSource} WHERE ${itemWhere.join(' AND ')} ORDER BY ${column} ${direction},c.id ${direction} LIMIT ? OFFSET ?`).bind(...seedValues,...values,limit+1,offset).all<Row>();const hasMore=result.results.length>limit;const rows=result.results.slice(0,limit);let next:string|null=null;
 if(hasMore&&rows.length&&this.env.CURSOR_SIGNING_SECRET){const last=rows[rows.length-1];const data:Cursor={query:fingerprint,sort,value:sort==='newest'?last.published_at:sort==='title'?last.title:last.sort_score,id:last.id,exp:Date.now()+86400000};const payload=encode(JSON.stringify(data));next=payload+'.'+await signCursor(payload,this.env.CURSOR_SIGNING_SECRET)}
 return {items:await this.hydrate(rows),total,page,page_size:limit,total_pages:Math.ceil(total/limit),next_cursor:next,has_more:hasMore};
 }
}
export function createCatalog(env:Env):CatalogRepository{if(!env.CATALOG_DB)throw new AppError('CATALOG_UNAVAILABLE','The catalog database has not been configured.',503);return new D1CatalogRepository(env,publicCatalogDatabase(env.CATALOG_DB),env.SEARCH_DB?new D1SearchProvider(publicCatalogDatabase(env.SEARCH_DB),env.CURSOR_SIGNING_SECRET):undefined)}


import {VISION_ROOT_CATEGORIES as ROOT_CATEGORIES,visionChildCategories,categoryById,categoryLineage,TAXONOMY_VERSION,VISION_TAXONOMY_VERSION,PREVIOUS_EDITORIAL_TAXONOMY_VERSION,FOLLOWUP_EDITORIAL_TAXONOMY_VERSION,EXPANSION_EDITORIAL_CATEGORY_IDS,FOLLOWUP_EDITORIAL_CATEGORY_IDS,EDITORIAL_REVIEW_CATEGORY_IDS} from './catalog';
export const CATEGORY_ENGINE_VERSION='jot-category-hierarchy-2.3.0';
const PREVIOUS_CATEGORY_ENGINE_VERSION='jot-category-hierarchy-2.2.0';
export const CATEGORY_TEMPLATES=['a black and white coloring page showing {}','an outline drawing of {}'] as const;
export const UNKNOWN_SUBJECTS=['abstract photographic noise and random colored textures','a dense page of printed text paragraphs','a medical scan or technical blueprint'];
export interface CategoryRun {scope:string;scores:number[][]}
export interface CategoryGeometry {regions:number;edgeDensity:number;inkRatio:number}
export interface HierarchicalCategoryAnalysis {geometry:CategoryGeometry|null;version:typeof CATEGORY_ENGINE_VERSION|typeof PREVIOUS_CATEGORY_ENGINE_VERSION;taxonomy_version:typeof VISION_TAXONOMY_VERSION;runs:CategoryRun[];primary:string|null;category_ids:string[];candidates:{id:string;score:number}[];review_required:boolean;reason:'supported'|'close-match'|'outside-catalog'}
export function categoryLabels(scope:string){if(scope==='root')return [...ROOT_CATEGORIES.map(c=>c.visual),...UNKNOWN_SUBJECTS];const root=categoryById(scope);if(!root||root.parent)throw new Error('Unknown category scope.');return [...visionChildCategories(scope).map(c=>c.visual),`other ${root.name.toLowerCase()} without a specific subtopic listed here`];}
function evidence(run:CategoryRun){const ids=run.scope==='root'?[...ROOT_CATEGORIES.map(c=>c.id),...UNKNOWN_SUBJECTS.map((_,i)=>'unknown-'+i)]:[...visionChildCategories(run.scope).map(c=>c.id),'other'];const n=ids.length;
 if(run.scores.length!==(run.scope==='root'?CATEGORY_TEMPLATES.length*3:CATEGORY_TEMPLATES.length)||run.scores.some(v=>v.length!==n||v.some(x=>!Number.isFinite(x)||x<0||x>1)||Math.abs(v.reduce((a,b)=>a+b,0)-1)>.001))throw new Error('Complete normalized image scores are required for both templates.');
 return ids.map((id,i)=>({id,score:run.scores.reduce((sum,v)=>sum+v[i],0)/run.scores.length,votes:run.scores.filter(v=>v.indexOf(Math.max(...v))===i).length})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
/** Only image-model evidence enters this resolver: no filename, prompt or SEO title. */
function deriveCategories(runs:CategoryRun[],geometry:CategoryGeometry|null,version:HierarchicalCategoryAnalysis['version']):HierarchicalCategoryAnalysis{
 if(!Array.isArray(runs)||!runs.length||runs[0].scope!=='root'||new Set(runs.map(r=>r.scope)).size!==runs.length||runs.length>4)throw new Error('One root run and at most three child runs are required.');
 if(geometry&&(!Number.isInteger(geometry.regions)||geometry.regions<0||!Number.isFinite(geometry.edgeDensity)||geometry.edgeDensity<0||geometry.edgeDensity>1||!Number.isFinite(geometry.inkRatio)||geometry.inkRatio<0||geometry.inkRatio>1))throw new Error('Invalid pixel geometry');
 const ranked=evidence(runs[0]),best=ranked[0],second=ranked[1],unknown=ranked.filter(c=>c.id.startsWith('unknown-')).reduce((a,c)=>a+c.score,0);
 const candidateRoots=ranked.filter(c=>!c.id.startsWith('unknown-')).slice(0,3);
 for(const run of runs.slice(1)){if(!candidateRoots.some(c=>c.id===run.scope))throw new Error('Child analysis must belong to a top root candidate.');evidence(run);}
 const childRun=runs.find(r=>r.scope===best.id),child=childRun?evidence(childRun):[],childSupport=child[0]?.id!=='other'&&child[0]?.score>=.70&&child[0]?.votes===2;
 // The first two readings see the whole composition. Center crops may support
 // it, but cannot silently replace an off-center subject with its decoration.
 const bestIndex=ROOT_CATEGORIES.findIndex(c=>c.id===best.id);
 const fullFrameConflict=version===CATEGORY_ENGINE_VERSION&&bestIndex>=0&&!runs[0].scores.slice(0,2).some(row=>row.indexOf(Math.max(...row))===bestIndex);
 const outside=best.id.startsWith('unknown-'),review=outside||fullFrameConflict||best.score<.28||best.score<.52&&!childSupport||(best.id==='mandalas'&&(!geometry||geometry.regions<12))||best.score-second.score<.06||best.votes<4||unknown>.3;
 const ids:string[]=outside?[]:[best.id];
 if(!review){const run=runs.find(r=>r.scope===best.id);if(visionChildCategories(best.id).length&&!run)throw new Error('The selected root requires its child analysis.');if(run){const sub=evidence(run),first=sub[0],next=sub[1];if(first.id!=='other'&&first.score>=.42&&first.score-(next?.score||0)>=.1&&first.votes===2)ids.push(...categoryLineage(first.id));}}
 // These are explicit cross-listed taxonomic relationships, not model guesses.
 if(ids.includes('ocean-life'))ids.push('ocean');if(ids[0]==='ocean')ids.push('animals','ocean-life');if(ids[0]==='dinosaurs')ids.push('animals');
 return {version,taxonomy_version:VISION_TAXONOMY_VERSION,geometry,runs,primary:outside?null:best.id,category_ids:[...new Set(ids)].slice(0,12),candidates:candidateRoots.map(({id,score})=>({id,score})),review_required:review,reason:outside?'outside-catalog':review?'close-match':'supported'};
}
export function decideCategories(runs:CategoryRun[],geometry:CategoryGeometry|null=null){return deriveCategories(runs,geometry,CATEGORY_ENGINE_VERSION);}
// Existing published evidence stays verifiable under its recorded rules. New
// preparation/cache/queue generations always use the current engine version.
export function isHierarchicalCategoryAnalysis(value:unknown):value is HierarchicalCategoryAnalysis{try{const v=value as HierarchicalCategoryAnalysis;if(!v||![CATEGORY_ENGINE_VERSION,PREVIOUS_CATEGORY_ENGINE_VERSION].includes(v.version)||v.taxonomy_version!==VISION_TAXONOMY_VERSION)return false;const derived=deriveCategories(v.runs,v.geometry,v.version);return JSON.stringify(derived)===JSON.stringify(v);}catch{return false;}}
export type ImageClassifier=(labels:string[],template:string,view:number)=>Promise<number[]>;
export async function classifyCategories(classify:ImageClassifier,geometry:CategoryGeometry|null=null){const root:CategoryRun={scope:'root',scores:[]};for(const view of [0,1,2])for(const template of CATEGORY_TEMPLATES)root.scores.push(await classify(categoryLabels('root'),template,view));const ranked=evidence(root).filter(c=>!c.id.startsWith('unknown-')).slice(0,3),runs=[root];for(const c of ranked){if(!visionChildCategories(c.id).length)continue;const run:CategoryRun={scope:c.id,scores:[]};for(const template of CATEGORY_TEMPLATES)run.scores.push(await classify(categoryLabels(c.id),template,0));runs.push(run);}return decideCategories(runs,geometry);}

export interface CategorySelection {source_sha256:string;analysis_version:string;taxonomy_version:string;category_ids:string[];method:'automatic'|'reviewed';review_note:string}
export function validateCategorySelection(value:unknown,analysis:{version:string;category_ids:string[];review_required:boolean},sha:string){const s=value as CategorySelection;if(!s||s.source_sha256!==sha||s.analysis_version!==analysis.version||![TAXONOMY_VERSION,VISION_TAXONOMY_VERSION,PREVIOUS_EDITORIAL_TAXONOMY_VERSION,FOLLOWUP_EDITORIAL_TAXONOMY_VERSION].includes(s.taxonomy_version)||!Array.isArray(s.category_ids)||!s.category_ids.length||s.category_ids.length>12||new Set(s.category_ids).size!==s.category_ids.length||s.category_ids.some(id=>!categoryById(id))||typeof s.review_note!=='string'||s.review_note.length>2000)return false;
 if(s.category_ids.some(id=>EDITORIAL_REVIEW_CATEGORY_IDS.has(id))&&(s.method!=='reviewed'||!(s.taxonomy_version===TAXONOMY_VERSION||s.taxonomy_version===FOLLOWUP_EDITORIAL_TAXONOMY_VERSION&&s.category_ids.every(id=>!EXPANSION_EDITORIAL_CATEGORY_IDS.has(id))||s.taxonomy_version===PREVIOUS_EDITORIAL_TAXONOMY_VERSION&&s.category_ids.every(id=>!FOLLOWUP_EDITORIAL_CATEGORY_IDS.has(id)&&!EXPANSION_EDITORIAL_CATEGORY_IDS.has(id)))))return false;
 if(s.method==='automatic')return !analysis.review_required&&s.review_note===''&&JSON.stringify(s.category_ids)===JSON.stringify(analysis.category_ids);
 if(s.method!=='reviewed'||s.review_note.trim().length<12)return false;
 return s.category_ids.every(id=>categoryLineage(id).every(parent=>s.category_ids.includes(parent)));
}

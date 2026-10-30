import {isHierarchicalCategoryAnalysis,type HierarchicalCategoryAnalysis} from '../taxonomy/analysis';
/** Image-only taxonomy evidence. Similarity scores are rankings, not calibrated probabilities. */
export const CATEGORY_ANALYSIS_VERSION='jot-category-vision-1.0.0';
export const CATEGORY_SUBJECTS=[
 {id:'pets',parent:'animals',label:'pet cats, dogs, puppies, kittens or rabbits'},
 {id:'woodland',parent:'animals',label:'forest wildlife such as foxes, deer, hedgehogs or squirrels'},
 {id:'farm-animals',parent:'animals',label:'farm animals such as cows, sheep, horses or pigs'},
 {id:'birds',parent:'animals',label:'birds such as owls, parrots, songbirds or eagles'},
 {id:'animals',label:'wild animals, insects or butterflies'},
 {id:'flowers',label:'flowers, petals, leaves and a botanical garden'},
 {id:'fantasy',label:'fantasy dragons, unicorns, fairies or fairy-tale castles'},
 {id:'mandalas',label:'a circular repeating geometric or floral mandala pattern'},
 {id:'holidays',label:'Christmas, Halloween, Easter or other holiday celebrations'},
 {id:'vehicles',label:'cars, trucks, buses, trains, boats or aircraft'},
 {id:'space',label:'outer space, planets, rockets or astronauts'},
 {id:'ocean',label:'sea turtles, fish, coral or other underwater ocean life'},
 {id:'food',label:'food, fruit, cupcakes, desserts or drinks'},
 {id:'dinosaurs',label:'prehistoric dinosaurs or pterosaurs'},
 {id:'outside-catalog',label:'ordinary buildings, houses, streets or shops'},
 {id:'outside-catalog',label:'people, faces, families or sports'},
 {id:'outside-catalog',label:'alphabet letters, numbers or educational worksheets'},
 {id:'outside-catalog',label:'landscapes, mountains, trees or natural scenery without animals'},
 {id:'outside-catalog',label:'everyday objects, tools or furniture'}
] as const;
export type CategoryScores=number[];
export type CategoryAnalysis=LegacyCategoryAnalysis|HierarchicalCategoryAnalysis;
export interface LegacyCategoryAnalysis {version:typeof CATEGORY_ANALYSIS_VERSION; scores:CategoryScores;primary:string|null;category_ids:string[];candidates:{id:string;score:number}[];review_required:boolean;reason:'supported'|'close-match'|'outside-catalog'}
export function recommendCategories(scores:readonly number[]):CategoryAnalysis{
 if(scores.length!==CATEGORY_SUBJECTS.length||scores.some(x=>!Number.isFinite(x)||x<0||x>1)||Math.abs(scores.reduce((a,b)=>a+b,0)-1)>.001)throw new Error('Complete normalized image-category scores are required.');
 const ranked=CATEGORY_SUBJECTS.map((s,i)=>({...s,score:scores[i]})).sort((a,b)=>b.score-a.score);
 const best=ranked[0],second=ranked[1],outside=best.id==='outside-catalog';
 // Never force a house or an unknown object into Fantasy just to fill a category.
 const primary=outside?null:('parent'in best?best.parent:best.id);const ids:string[]=primary?[primary]:[];
 if(primary&&best.id!==primary)ids.push(best.id);
 if(primary==='ocean')ids.push('animals','ocean-life');
 if(primary==='dinosaurs')ids.push('animals');
 const margin=best.score-second.score,unknown=ranked.filter(r=>r.id==='outside-catalog').reduce((sum,r)=>sum+r.score,0),review=outside||best.score<.32||margin<.08||unknown>.2;
 const candidates=ranked.filter((v,i,a)=>v.id!=='outside-catalog'&&a.findIndex(x=>x.id===v.id)===i).slice(0,5).map(v=>({id:v.id,score:v.score}));
 return{version:CATEGORY_ANALYSIS_VERSION,scores:[...scores],primary,category_ids:ids,candidates,review_required:review,reason:outside?'outside-catalog':review?'close-match':'supported'};
}
export function validCategoryAnalysis(v:unknown):v is CategoryAnalysis{
 if(isHierarchicalCategoryAnalysis(v))return true;
 if(!v||typeof v!=='object')return false;const a=v as LegacyCategoryAnalysis;if(a.version!==CATEGORY_ANALYSIS_VERSION||!Array.isArray(a.scores))return false;
 try{const expected=recommendCategories(a.scores);return JSON.stringify(a.category_ids)===JSON.stringify(expected.category_ids)&&a.primary===expected.primary&&a.review_required===expected.review_required&&a.reason===expected.reason&&JSON.stringify(a.candidates)===JSON.stringify(expected.candidates);}catch{return false;}
}

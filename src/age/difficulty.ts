export const DIFFICULTY_LEVELS=[
 {id:'easy',label:'Easy',description:'Bigger spaces and simpler outlines.',color:'#608658'},
 {id:'medium',label:'Medium',description:'A little more detail to explore.',color:'#bf893b'},
 {id:'hard',label:'Hard',description:'Smaller spaces and richer scenes.',color:'#bd6845'},
 {id:'very-hard',label:'Very Hard',description:'Fine detail for a longer coloring session.',color:'#8963a3'},
] as const;
export type DifficultyLevel=typeof DIFFICULTY_LEVELS[number]['id'];
export const DIFFICULTY_VERSION='jot-detail-1.0';
/** Uses the source-bound visual/detail score already required for publication. */
export function difficultyForScore(score:number):DifficultyLevel{if(!Number.isFinite(score)||score<0||score>100)throw new Error('Invalid image detail score.');return score<23?'easy':score<42?'medium':score<72?'hard':'very-hard';}
export function difficultyLabel(value:unknown){return DIFFICULTY_LEVELS.find(v=>v.id===value)?.label||(value==='detailed'?'Detailed':String(value||'Ready to color'));}
export function difficultyValues(values:readonly string[]){return [...new Set(values.flatMap(v=>v==='detailed'?['medium','hard','very-hard']:[v]))];}
/** Indexed score ranges keep detail filtering out of full-catalog image/JSON scans. */
export function catalogDifficultyFilter(values:readonly string[],alias='c'){
 const ranges:Record<string,[number,number]>={easy:[0,2299],medium:[2300,4199],hard:[4200,7199],'very-hard':[7200,10000]};
 const clauses=difficultyValues(values).map(v=>{const range=ranges[v];if(!range)throw new Error('Unknown difficulty.');return `ar.score_hundredths BETWEEN ${range[0]} AND ${range[1]}`;});
 return `${alias}.id IN (SELECT ar.content_id FROM age_recommendation ar INDEXED BY age_recommendation_detail JOIN content dc ON dc.id=ar.content_id AND dc.active_version=ar.content_version JOIN asset da ON da.content_id=ar.content_id AND da.content_version=ar.content_version AND da.role='printable_webp_bw' AND da.sha256=ar.source_sha256 AND da.verified=1 WHERE (${clauses.join(' OR ')}))`;
}
export function searchDifficultyValues(values:readonly string[]){return [...difficultyValues(values),...(values.includes('detailed')?['detailed']:[])];}
export function searchDifficultySQL(alias='d'){return `${alias}.difficulty`;}

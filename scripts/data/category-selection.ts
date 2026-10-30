import {categoryById,categoryLineage,TAXONOMY_VERSION} from '../../src/taxonomy/catalog';
import {type CategorySelection} from '../../src/taxonomy/analysis';
import {validCategoryAnalysis,type CategoryAnalysis} from '../../src/age/categories';
/** Automatic suggestions are applied only with decisive in-taxonomy evidence.
 * Editors may choose existing/custom categories, but must explain an override. */
export function selectPreparedCategories(analysis:CategoryAnalysis,requested='auto',reviewNote=''){
 if(!validCategoryAnalysis(analysis))throw new Error('A current visual category analysis is required.');
 const automatic=!requested||requested==='auto';
 if(automatic){if(analysis.review_required||!analysis.primary)throw new Error('Check the category suggestions in category-analysis.json, then provide --categories and --category-review with your visual review. No unrelated category was assigned.');return analysis.category_ids;}
 const ids=requested.split(',').map(x=>x.trim());if(!ids.length||ids.length>12||new Set(ids).size!==ids.length||ids.some(x=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x)))throw new Error('Choose valid, unique category IDs.');
 if((analysis.review_required||JSON.stringify(ids)!==JSON.stringify(analysis.category_ids))&&reviewNote.trim().length<12)throw new Error('The selected categories differ from the image suggestion. Add --category-review explaining the visible subject.');
 if(ids.some(id=>!categoryById(id)))throw new Error('Choose categories from the current taxonomy.');
 return [...new Set(ids.flatMap(categoryLineage))];
}

export function preparedCategorySelection(analysis:CategoryAnalysis,sha:string,requested='auto',reviewNote=''):CategorySelection{const ids=selectPreparedCategories(analysis,requested,reviewNote);const automatic=!analysis.review_required&&JSON.stringify(ids)===JSON.stringify(analysis.category_ids)&&!reviewNote.trim();return{source_sha256:sha,analysis_version:analysis.version,taxonomy_version:TAXONOMY_VERSION,category_ids:ids,method:automatic?'automatic':'reviewed',review_note:automatic?'':reviewNote.trim()};}

import type {Content} from '../server/types';
import {ageLabel} from '../age/model';
import {canonicalSubject,equivalents} from '../search/intent';
import {subjectFocus} from './collection-matching';
export const RELATED_MATCH_VERSION='jot-related-subject-2';
export const RELATED_VIEWS=['best','theme','detail','collection'] as const;
export type RelatedView=typeof RELATED_VIEWS[number];
export interface RelatedMatch {item:Content;score:number;reasons:string[];shared:string[];sameCollection:boolean;sameTheme:boolean;similarDetail:boolean;}
export interface CollectionOverview {id:string;name:string;href:string;total:number|null;previews:Content[];}
export interface RelatedResult {matches:RelatedMatch[];explore:Content[];theme:string;candidateCount:number;collection?:CollectionOverview;}
/** Reuse published candidates already loaded for this page; never pad the strip with duplicates. */
export function collectionOverview(source:Content,candidates:Content[],metadata:{id:string;name:string;count:number|null}):CollectionOverview|undefined{
 if(metadata.id!==source.category||!metadata.name||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.id))return;
 const seen=new Set<string>(),previews:Content[]=[];
 for(const item of [source,...candidates]){if(item.category!==metadata.id||!item.thumbnail||seen.has(item.id))continue;seen.add(item.id);previews.push(item);if(previews.length===3)break;}
 return{id:metadata.id,name:metadata.name,href:`/coloring-pages/${metadata.id}/`,total:typeof metadata.count==='number'&&Number.isSafeInteger(metadata.count)&&metadata.count>=1?metadata.count:null,previews};
}
// Decorative words are useful context, but cannot outweigh the actual subject.
const decoration=new Set(['flower','flowers','floral','leaf','leaves','garden','plants','plant','coloring','page','printable','detailed','art','cute','nature','background','pattern']);
const aliases:Record<string,string>={leaves:'leaf',vehicles:'vehicle'};
export function relatedToken(value:string){const clean=value.normalize('NFKC').toLowerCase().trim().replace(/[\s_-]+/g,' ');return aliases[clean]||canonicalSubject(clean);}
export function tagWeight(tag:string){return decoration.has(relatedToken(tag))?1:7;}
export function candidateTagWeight(item:Content,tag:string){return subjectFocus(item).has(relatedToken(tag))?100:tagWeight(tag);}
export function candidateTags(item:Content){const focus=subjectFocus(item),tags=item.tags.flatMap(tag=>{const raw=tag.trim();return focus.has(relatedToken(raw))?[raw,...equivalents(relatedToken(raw))]:[raw];});return [...new Set(tags.filter(Boolean))].sort((a,b)=>candidateTagWeight(item,b)-candidateTagWeight(item,a)||a.localeCompare(b)).slice(0,10);}
function tokens(item:Content){return new Set([...item.tags.map(relatedToken),...item.title.toLowerCase().split(/[^\p{L}\p{N}]+/u).map(relatedToken)].filter(t=>t.length>2&&!['the','and','with','little','friendly','friends','gentle','playful','sleepy','adventure','beautiful','coloring','page'].includes(t)));}
export function rankRelated(source:Content,candidates:Content[]):RelatedResult {
 const subject=tokens(source),focus=subjectFocus(source),seen=new Set<string>([source.id]),matches:RelatedMatch[]=[],explore:Content[]=[];
 for(const item of candidates){if(seen.has(item.id)||item.example_only)continue;seen.add(item.id);const shared=[...tokens(item)].filter(t=>subject.has(t)),candidateFocus=subjectFocus(item),strong=[...candidateFocus].filter(t=>focus.has(t)).sort();const sameCollection=item.category===source.category,sameTheme=!!source.subcategory&&item.subcategory===source.subcategory;const delta=source.recommendedAge&&item.recommendedAge?Math.abs(source.recommendedAge.score-item.recommendedAge.score):undefined,similarDetail=delta!==undefined&&delta<=16;
  // Detail/age alone never makes unrelated subjects a best match.
  if(!sameCollection&&!sameTheme&&!strong.length){explore.push(item);continue;}
  const reasons:string[]=[];if(strong.length)reasons.push('Shared subject: '+strong.slice(0,2).join(' & '));if(sameTheme)reasons.push('Same '+source.subcategory!.replaceAll('-',' ')+' theme');else if(sameCollection)reasons.push('From the '+source.categoryName+' collection');if(similarDetail)reasons.push('Similar coloring detail');if(source.recommendedAge?.band===item.recommendedAge?.band&&item.recommendedAge)reasons.push(ageLabel(item.recommendedAge.band));
  matches.push({item,shared,score:strong.length*80+Math.min(10,shared.length*2)+Number(sameTheme)*24+Number(sameCollection)*15+(similarDetail?Math.max(0,8-(delta||0)/2):0),reasons:reasons.slice(0,3),sameCollection,sameTheme:!!(sameTheme||strong.length),similarDetail});
 }
 matches.sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id));explore.sort((a,b)=>a.id.localeCompare(b.id));return{matches,explore:explore.slice(0,4),theme:source.subcategory?source.subcategory.replaceAll('-',' '):source.categoryName.toLowerCase(),candidateCount:seen.size-1};
}
export function relatedView(value:string|null):RelatedView{return RELATED_VIEWS.includes(value as RelatedView)?value as RelatedView:'best';}
export function selectRelated(result:RelatedResult,view:RelatedView){return result.matches.filter(m=>view==='theme'?m.sameTheme:view==='detail'?m.similarDetail:view==='collection'?m.sameCollection:true).slice(0,8);}

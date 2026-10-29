import {categories,animalCategories} from '../ui/categories';
import type {Content,CatalogQuery} from '../server/types';
import {canonicalSubject,searchWords} from '../search/intent';
export const COLLECTION_MATCH_VERSION='jot-collection-evidence-1';
export interface CollectionDefinition {id:string;name:string;parent:string|null;href:string;icon:string;total:number;}
export interface CollectionMatch {collection:CollectionDefinition;previews:Content[];reason:string;relation:'narrower'|'broader'|'shared-pages'|'shared-subject'|'browse';score:number;evidenceIds:string[];subjects:string[];}
export interface CollectionDiscovery {mode:'browse'|'related';matches:CollectionMatch[];topics?:Array<{label:string;href:string}>;sourceCount:number;candidateCount:number;version:string;}
const generic=new Set(['coloring','page','pages','art','drawing','outline','printable','black','white','cute','beautiful','detailed','easy','friendly','gentle','playful','sleepy','little','friends','friend','adventure','wishes','smiling','fictional','round','young','broad','swirled','spotted','fluffy','stands','sits','rests','rest','opens','walks','floats','swims','among','with','and','the','a','an','its','their','her','his','has','scene','picture','decorative','decorations','background','cozy','garden','inviting','storybook','patterned','rounded','unbadged']);
const memberships=(item:Content)=>new Set(item.category_ids||[item.category,...(item.subcategory?[item.subcategory]:[])]);
const categoryAnchors:Record<string,string[]>={animals:['animal','fox','rabbit','cat','dog','deer','owl','bird','hedgehog','cow','dinosaur','turtle','fish','butterfly','horse','lion','tiger','bear','elephant'],flowers:['flower','floral','botanical','petal','petals','hibiscus','rose','tulip','daisy','daisies','bloom'],fantasy:['fantasy','dragon','castle','fairy','unicorn','mermaid','wizard','magic'],mandalas:['mandala','geometric','radial','kaleidoscope'],holidays:['holiday','winter','christmas','snowman','halloween','easter','valentine','thanksgiving','santa','hanukkah','diwali','ramadan','eid','birthday'],vehicles:['vehicle','car','camper','van','bus','truck','train','motorcycle','bicycle','boat','airplane','helicopter'],space:['space','astronaut','planet','moon','rocket','galaxy','alien'],ocean:['ocean','underwater','marine','sea','reef'],food:['food','cupcake','dessert','berries','cake','pizza','fruit','apple','candy'],dinosaurs:['dinosaur','prehistoric','triceratops','stegosaurus'],woodland:['woodland','fox','deer','hedgehog','owl'],pets:['pet','cat','dog','kitten','puppy'],birds:['bird','owl','eagle','parrot','penguin'],'farm-animals':['farm','cow','pig','sheep','goat','hen'],'ocean-life':['ocean','underwater','marine','sea','reef']};
function supportsMembership(item:Content,collection:CollectionDefinition){if(item.category===collection.id)return true;const lead=item.description.split(/\b(?:among|beside|beneath|behind|surrounded by|against|alongside|with|has|around|near|in front of|in a|in the|through)\b/i)[0]||'',terms=new Set(searchWords(item.title+' '+lead,80).map(canonicalSubject));return(categoryAnchors[collection.id]||searchWords(collection.name)).some(term=>terms.has(canonicalSubject(term)));}
function reliableSource(source:Content[],query:CatalogQuery,definitions:CollectionDefinition[]){const active=definitions.find(c=>c.id===(query.subcategory||query.category));return source.filter(item=>!item.example_only&&(!active||memberships(item).has(active.id)&&supportsMembership(item,active)));}
/** Only source-backed subject terms, before the descriptive background clause. */
export function subjectFocus(item:Pick<Content,'title'|'description'|'tags'>){
 const foreground=item.description.split(/\b(?:among|beside|beneath|behind|surrounded by|against|alongside|with|has|around|near|in front of|in a|in the|through)\b/i)[0]||'';
 const title=new Set(searchWords(item.title,40).map(canonicalSubject).filter(w=>w.length>2&&!generic.has(w))),lead=new Set(searchWords(foreground,64).map(canonicalSubject));
 const prominent=new Set(title);
 // A tag needs support in the title or main caption clause; background-only tags cannot form a match.
 for(const raw of item.tags){const term=canonicalSubject(raw.toLowerCase());if((lead.has(term)||title.has(term))&&!generic.has(term))prominent.add(term);}
 return prominent;
}
export function collectionDefinitions(rows:Array<{id:string;name:string;parent_id:string|null;count:number}>):CollectionDefinition[]{
 const known=new Map(categories.map(c=>[c.id,{href:`/coloring-pages/${c.id}/`,icon:c.id}]));
 for(const c of animalCategories)if(!known.has(c.id))known.set(c.id,{href:`/coloring-pages/animals/${c.id}/`,icon:c.id==='ocean-life'?'ocean':c.id});
 return rows.filter(r=>known.has(r.id)&&r.count>0).map(r=>({id:r.id,name:r.name,parent:r.parent_id,href:known.get(r.id)!.href,icon:known.get(r.id)!.icon,total:r.count}));
}
export function rankCollections(query:CatalogQuery,source:Content[],candidates:Content[],definitions:CollectionDefinition[]):CollectionDiscovery{
 const active=query.subcategory||query.category||'',browse=!active&&!query.q,sourcePages=reliableSource(source,query,definitions),sourceIds=new Set(sourcePages.map(i=>i.id)),pool=[...new Map([...sourcePages,...candidates.filter(i=>!i.example_only)].map(i=>[i.id,i])).values()];
 const frequency=new Map<string,number>();for(const item of sourcePages)for(const term of subjectFocus(item))frequency.set(term,(frequency.get(term)||0)+1);
 const activeDefinition=definitions.find(c=>c.id===active),matches:CollectionMatch[]=[];
 for(const collection of definitions){if(collection.id===active)continue;const members=pool.filter(i=>memberships(i).has(collection.id)&&supportsMembership(i,collection)&&!!i.thumbnail);if(!members.length)continue;
  if(browse){if(collection.parent)continue;matches.push({collection,previews:members.slice(0,3),reason:'Find your next favorite in this collection.',relation:'browse',score:collection.total,evidenceIds:members.slice(0,3).map(i=>i.id),subjects:[]});continue;}
  if(!sourcePages.length)continue;
  const overlap=members.filter(i=>sourceIds.has(i.id)&&supportsMembership(i,collection)),narrower=collection.parent===active,broader=activeDefinition?.parent===collection.id;
  const subjectMembers=members.filter(i=>!sourceIds.has(i.id)).map(item=>({item,shared:[...subjectFocus(item)].filter(t=>frequency.has(t))})).filter(m=>m.shared.length);
  const subjects=[...new Set(subjectMembers.flatMap(m=>m.shared))].sort((a,b)=>(frequency.get(b)||0)-(frequency.get(a)||0)||a.localeCompare(b));
  // A loose sibling category or a shared leaf/flower in the background is insufficient.
  const coverage=Math.max(overlap.length/Math.max(1,sourcePages.length),overlap.length/Math.max(1,collection.total));
  let relation:CollectionMatch['relation'],reason:string,score:number,proof:Content[];
  if(narrower&&overlap.length){relation='narrower';reason=`A closer look at ${collection.name.toLowerCase()} in this collection.`;score=130+Math.min(15,overlap.length*3);proof=overlap;}
  else if(broader&&overlap.length){relation='broader';reason=`Explore the wider ${collection.name.toLowerCase()} collection.`;score=70;proof=overlap;}
  else if(overlap.length&&coverage>=.5){relation='shared-pages';reason=`Also includes ${overlap[0].title}.`;score=100+coverage*20;proof=overlap;}
  else if(subjectMembers.length){relation='shared-subject';reason=`More ${subjects.slice(0,2).join(' and ')} subjects to explore.`;score=80+Math.min(20,subjects.length*5);proof=subjectMembers.map(m=>m.item);}
  else continue;
  const previews=[...new Map(proof.map(i=>[i.id,i])).values()].slice(0,3);matches.push({collection,previews,reason,relation,score,evidenceIds:proof.map(i=>i.id).slice(0,12),subjects});
 }
 // Keep a broad parent after the closer themes, and make ties independent of input order.
 matches.sort((a,b)=>b.score-a.score||a.collection.id.localeCompare(b.collection.id));
 return{mode:browse?'browse':'related',matches:matches.slice(0,browse?10:6),sourceCount:sourcePages.length,candidateCount:pool.length,version:COLLECTION_MATCH_VERSION};
}
export function scopedCollectionURL(collection:CollectionDefinition,query:CatalogQuery){const params=new URLSearchParams();if(query.q)params.set('q',query.q);if(query.recommended_age)params.set('recommended_age',query.recommended_age);for(const age of query.age||[])params.append('age',age);for(const difficulty of query.difficulty||[])params.append('difficulty',difficulty);return collection.href+(params.size?'?'+params:'');}
export function collectionTopics(source:Content[],query:CatalogQuery,definitions:CollectionDefinition[]){const counts=new Map<string,number>();for(const item of reliableSource(source,query,definitions)){const focus=subjectFocus(item);for(const term of new Set(item.tags.map(t=>canonicalSubject(t.toLowerCase()))))if(focus.has(term)&&term.length>2)counts.set(term,(counts.get(term)||0)+1);}const active=definitions.find(c=>c.id===(query.subcategory||query.category)),base=active||{href:'/coloring-pages/'} as CollectionDefinition;const preferred=new Set((categoryAnchors[active?.id||'']||categoryAnchors[active?.parent||'']||[]).map(canonicalSubject));return[...counts].sort((a,b)=>(b[1]*10+Number(preferred.has(b[0]))*20)-(a[1]*10+Number(preferred.has(a[0]))*20)||a[0].localeCompare(b[0])).filter(([term])=>term!==(query.q||'').toLowerCase()).slice(0,6).map(([label])=>({label,href:scopedCollectionURL(base,{...query,q:label})+'#catalog-results'}));}

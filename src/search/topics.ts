import {COLORING_TAXONOMY} from '../taxonomy/catalog';
import {canonicalSubject,intentWords,intentExpression,searchWords} from './intent';
import {numberSubjects} from './number-subjects';
import {SEARCH_TOPIC_ALIASES} from './topic-aliases';

const key=(value:string)=>searchWords(value).join(' ');
export const topicSearchVocabulary=[...new Set(COLORING_TAXONOMY.flatMap(c=>[c.id,c.name,...c.aliases].flatMap(name=>searchWords(name))))];
const topicAliases=new Map<string,Set<string>>();
const broadQualifiers=new Set(['disney','pixar','sanrio','netflix','dreamworks','nickelodeon','car','vehicle','automobile','character','logo','emblem','brand','bear','electric']);
/** A submodel or scene alias can discover its collection, but cannot widen artwork results. */
function isBroadAlias(alias:string,identities:string[]){
 const terms=intentWords(alias).map(canonicalSubject);
 for(const identity of identities){
  const base=intentWords(identity).map(canonicalSubject);if(!base.length)continue;
  const start=terms.findIndex((_,i)=>base.every((word,j)=>terms[i+j]===word));
  if(start<0)continue;
  const extra=[...terms.slice(0,start),...terms.slice(start+base.length)];
  if(extra.some(word=>!broadQualifiers.has(word)))return false;
 }
 return true;
}
for(const category of COLORING_TAXONOMY){
 const identities=[category.id,category.name,category.topic];
 for(const name of [...identities,...category.aliases.filter(alias=>isBroadAlias(alias,identities))]){
  const normalized=intentWords(name).join(' ');if(!normalized)continue;
  if(!topicAliases.has(normalized))topicAliases.set(normalized,new Set());
  topicAliases.get(normalized)!.add(category.id);
 }
}
// Film searches include its reviewed HUNTR/X collection. Group searches stay specific.
for(const alias of SEARCH_TOPIC_ALIASES)for(const name of alias.names)topicAliases.set(key(name),new Set(alias.ids));

/** Only taxonomy membership supplies topic expansions; no artwork identity is inferred. */
export function searchTopicIds(query:string):string[]{
 const values=topicAliases.get(intentWords(query).join(' '));
 if(!values||values.size>1&&!values.has('k-pop-demon-hunters'))return [];
 return [...values];
}
/** Recognition for stable ranking only: modifiers never become OR expansions. */
export function containsSearchTopicIdentity(words:string[]){
 for(let size=words.length;size>0;size--)for(let start=0;start+size<=words.length;start++){
  const ids=topicAliases.get(words.slice(start,start+size).join(' '));
  if(ids&&(ids.size===1||ids.has('k-pop-demon-hunters')))return true;
 }
 return false;
}
export function withTopicExpression(expression:string,query:string,known:ReadonlySet<string>=new Set()){
 const ids=searchTopicIds(query);
 const expand=(literal:string,values:string[])=>'('+literal+' OR categories:('+values.map(id=>'"'+key(id)+'"').join(' OR ')+'))';
 if(ids.length)return expand(expression,ids);
 const words=intentWords(query);if(numberSubjects(words).length)return expression;
 // A known alias can occupy part of a longer request. Expand that identity
 // alone; every requested character, model and scene term stays an AND clause.
 const clauses:string[]=[];let plain:string[]=[];let found=false;
 const flush=(last=false)=>{if(plain.length){clauses.push(intentExpression(plain,known,last));plain=[];}};
 for(let start=0;start<words.length;){
  let length=0,topics:string[]=[];
  for(let size=words.length-start;size>0;size--){const values=topicAliases.get(words.slice(start,start+size).join(' '));if(values&&(values.size===1||values.has('k-pop-demon-hunters'))){length=size;topics=[...values];break;}}
  if(length){flush();clauses.push(expand(intentExpression(words.slice(start,start+length),known,start+length===words.length),topics));start+=length;found=true;}
  else plain.push(words[start++]);
 }
 flush(true);return found?clauses.join(' AND '):expression;
}

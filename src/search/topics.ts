import {COLORING_TAXONOMY} from '../taxonomy/catalog';
import {canonicalSubject,intentWords,searchWords} from './intent';

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
for(const name of ['kpop','k pop','kpop demon hunters','k pop demon hunters','demon hunters'])topicAliases.set(key(name),new Set(['k-pop-demon-hunters','huntrix']));
for(const name of ['huntrix','huntrx','huntr/x'])topicAliases.set(key(name),new Set(['huntrix']));

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
export function withTopicExpression(expression:string,query:string){
 const ids=searchTopicIds(query);
 if(!ids.length)return expression;
 const phrases=ids.map(id=>'"'+key(id)+'"');
 return '('+expression+' OR categories:('+phrases.join(' OR ')+'))';
}

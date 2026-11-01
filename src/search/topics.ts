import {COLORING_TAXONOMY} from '../taxonomy/catalog';
import {intentWords,searchWords} from './intent';

const key=(value:string)=>searchWords(value).join(' ');
export const topicSearchVocabulary=[...new Set(COLORING_TAXONOMY.flatMap(c=>[c.id,c.name,...c.aliases].flatMap(name=>searchWords(name))))];
const topicAliases=new Map<string,Set<string>>();
for(const category of COLORING_TAXONOMY){
 for(const name of [category.id,category.name,category.topic,...category.aliases]){
  const normalized=key(name);
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
export function withTopicExpression(expression:string,query:string){
 const ids=searchTopicIds(query);
 if(!ids.length)return expression;
 const phrases=ids.map(id=>'"'+key(id)+'"');
 return '('+expression+' OR categories:('+phrases.join(' OR ')+'))';
}

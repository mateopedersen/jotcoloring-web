import {COLORING_TAXONOMY,categoryPath} from '../taxonomy/catalog';
import {NAVIGATION_COLLECTIONS,collectionPath} from '../taxonomy/navigation';
import {catalogLocation} from '../taxonomy/catalog-location';
import {landingIdentity} from '../taxonomy/landing-identity';
import {NUMBER_VALUES,numberTopic} from '../taxonomy/number-topics';
import {writtenNumber} from './number-subjects';
import {SEARCH_TOPIC_ALIASES} from './topic-aliases';
import type {SearchCollectionOption} from './collection-matches';

/** Built from the same canonical source as new-topic publication and navigation. */
export const SEARCH_COLLECTION_OPTIONS:SearchCollectionOption[]=[...new Map<string,SearchCollectionOption>([
 ...COLORING_TAXONOMY.map(c=>[c.id,{id:c.id,name:c.name,topic:c.topic,parent:c.parent,aliases:[...c.aliases,...SEARCH_TOPIC_ALIASES.filter(alias=>alias.ids[0]===c.id).flatMap(alias=>alias.names)],icon:landingIdentity(catalogLocation(categoryPath(c.id))!).icon,href:categoryPath(c.id)}] as const),
 ...NAVIGATION_COLLECTIONS.map(c=>[c.id,{id:c.id,name:c.name,aliases:c.roots,roots:c.roots,icon:c.icon,href:collectionPath(c.id)}] as const)
]).values(),...NUMBER_VALUES.map(n=>({...numberTopic(n)!,parent:'numbers',aliases:[String(n),'number '+writtenNumber(n),writtenNumber(n)],icon:'education',href:numberTopic(n)!.path}))];

import reviewedCopy from './navigation-copy.json';
import type {CatalogLocation} from './catalog-location';
import {NUMBER_INTROS} from './number-topics';
import {displayTitle} from '../ui/titles';
import {DIRECTORY_SEO,ALL_PAGES_SEO} from '../seo/catalog-copy';
/** One reviewed identity for the page, structured data and its social cover. */
export function landingIdentity(location:CatalogLocation){
 const {collection,topic,number}=location;
 const root=!collection&&!topic&&!number,scope=collection?.name||topic?.topic;
 const heading=root?(location.allPages?ALL_PAGES_SEO.heading:DIRECTORY_SEO.heading):number?`${number.name} coloring pages`:`${location.allPages?'All ':''}${scope} coloring pages${location.path.startsWith('/collections/')&&!location.allPages?' collection':''}`;
 return {heading:displayTitle(heading),intro:number?NUMBER_INTROS[number.number]:collection?collection.intro:topic?((reviewedCopy as Record<string,string>)[topic.id]||topic.intro):location.allPages?ALL_PAGES_SEO.intro:DIRECTORY_SEO.intro,icon:collection?.icon||(topic?.parent==='cartoons'?'cartoons':topic?.parent==='video-games'?'video-games':topic?.parent==='dolls-toys'?'dolls-toys':topic?.icon)||(number?'education':'all')};
}

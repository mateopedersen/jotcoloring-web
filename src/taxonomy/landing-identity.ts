import reviewedCopy from './navigation-copy.json';
import type {CatalogLocation} from './catalog-location';
import {NUMBER_INTROS} from './number-topics';
import {displayTitle} from '../ui/titles';
/** One reviewed identity for the page, structured data and its social cover. */
export function landingIdentity(location:CatalogLocation){
 const {collection,topic,number}=location;
 return {heading:displayTitle(number?`${number.name} coloring pages`:collection?`${collection.name} coloring pages`:topic?`${topic.topic} coloring pages`:'Free printable coloring pages'),intro:number?NUMBER_INTROS[number.number]:collection?collection.intro:topic?((reviewedCopy as Record<string,string>)[topic.id]||topic.intro):'Browse printable drawings by subject, collection, and recommended age.',icon:collection?.icon||(topic?.parent==='cartoons'?'cartoons':topic?.parent==='video-games'?'video-games':topic?.parent==='dolls-toys'?'dolls-toys':topic?.icon)||(number?'education':'all')};
}

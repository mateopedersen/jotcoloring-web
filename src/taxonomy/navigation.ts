export {collectionPath,publicCategoryPath} from './routes';
import {categoryById} from './catalog';
/** Public navigation groups are separate from artwork classification labels. */
export interface NavigationCollection {id:string;name:string;icon:string;roots:string[];cover_topics:string[];intro:string}
export const NAVIGATION_COLLECTIONS:NavigationCollection[]=[
 {id:'animals',cover_topics:['animals','woodland','dinosaurs'],name:'Animals & Wildlife',icon:'animals',roots:['animals','dinosaurs'],intro:'Explore pets, wild animals, and dinosaurs. Browse a subject for single animals, patterned details, and illustrated habitats.'},
 {id:'ocean',cover_topics:['sea-turtles','fish','sharks'],name:'Ocean',icon:'ocean',roots:['ocean'],intro:'Sea turtles, shells, reef fish, and other underwater subjects explore the ocean. Find broad animal outlines alongside detailed seabeds and coastal settings.'},
 {id:'nature',cover_topics:['nature','flowers','seasons'],name:'Nature & Flowers',icon:'flowers',roots:['nature','flowers','seasons'],intro:'Flowers, forests, mountains, seasonal scenes, and changing weather bring the natural world to the page. Choose a botanical subject or explore an outdoor setting.'},
 {id:'characters',cover_topics:['cartoons','video-games','dolls-toys'],name:'Characters & Fantasy',icon:'cartoons',roots:['cartoons','video-games','dolls-toys','fantasy'],intro:'Find familiar cartoon, game, and doll characters alongside imaginary creatures and storybook worlds. Each character topic keeps its own collection.'},
 {id:'holidays',cover_topics:['halloween','birthdays','easter'],name:'Holidays & Celebrations',icon:'holidays',roots:['holidays','celebrations'],intro:'Browse Halloween costumes, Easter eggs, Valentine hearts, harvest scenes, birthdays, and other celebrations. Choose a specific occasion to explore its drawings.'},
 {id:'education',cover_topics:['alphabet','numbers','school'],name:'Learning, Letters & Numbers',icon:'education',roots:['education'],intro:'Explore alphabet letters, individual letter collections, numbers and counting, shapes, and classroom subjects. Each letter and number has its own topic page, while the wider collection brings the learning themes together.'},
 {id:'vehicles',cover_topics:['cars','robots','trains'],name:'Vehicles & Robots',icon:'vehicles',roots:['vehicles','robots'],intro:'Cars, trucks, trains, boats, aircraft, and illustrated robots offer wheels, wings, and mechanical shapes to color. Browse each subject for different silhouettes and settings.'},
 {id:'art-patterns',cover_topics:['mandalas','geometric-patterns','art-supplies'],name:'Art & Patterns',icon:'mandalas',roots:['art-patterns','mandalas'],intro:'Explore circular mandalas, floral and geometric repetitions, decorative motifs, and art supplies. Broad sections and closely arranged patterns offer different amounts of detail.'},
 {id:'everyday-life',cover_topics:['people','food','buildings'],name:'Everyday Life',icon:'people',roots:['people','buildings','objects','food','fashion','music','sports'],intro:'People, homes, food, clothing, music, sports, and familiar objects fill this collection. Choose a subject to find everyday scenes and imaginative variations.'},
 {id:'space',cover_topics:['astronauts','planets','rockets'],name:'Space',icon:'space',roots:['space'],intro:'Explore astronauts, planets, rockets, and imagined space adventures. Outlined spacecraft and celestial settings bring different shapes and backgrounds to color.'},
 {id:'faith',cover_topics:['religious'],name:'Faith & Religion',icon:'heart',roots:['faith'],intro:'Browse drawings connected with different faith traditions, including visible symbols, places of worship, and community scenes. Each subject page keeps its own context and imagery.'},
 {id:'bible',cover_topics:['bible'],name:'Bible',icon:'bible',roots:['bible'],intro:'Browse illustrations inspired by Bible stories and Christian symbols. Arks, doves, shepherds, outlined words, and illustrated settings offer varied drawing detail.'}
];
export const navigationCollection=(id:string)=>NAVIGATION_COLLECTIONS.find(c=>c.id===id);
export function collectionForRoot(id:string){
 let current=categoryById(id);
 while(current){
  const group=NAVIGATION_COLLECTIONS.find(c=>c.roots.includes(current!.id));
  if(group)return group;
  current=current.parent?categoryById(current.parent):undefined;
 }
 return undefined;
}

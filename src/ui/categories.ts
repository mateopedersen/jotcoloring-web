import {ROOT_CATEGORIES,categoryById,childCategories,categoryPath} from '../taxonomy/catalog';
export const categories=ROOT_CATEGORIES;
export const animalCategories=[...childCategories('animals'),categoryById('dinosaurs')!];
export const hrefCategory=categoryPath;
export const coloringTopic=(id:string)=>categoryById(id)?.topic||id;

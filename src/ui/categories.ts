import {ROOT_CATEGORIES,categoryById,childCategories,categoryPath} from '../taxonomy/catalog';
import {categoryNavigationSummary} from './category-summary';
const navigationCategory=<T extends {id:string;name:string;intro:string}>(category:T):T=>({...category,intro:categoryNavigationSummary(category)});
export const categories=ROOT_CATEGORIES.map(navigationCategory);
export const animalCategories=[...childCategories('animals'),categoryById('dinosaurs')!].map(navigationCategory);
export const hrefCategory=categoryPath;
export const coloringTopic=(id:string)=>categoryById(id)?.topic||id;

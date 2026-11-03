import type {CatalogLocation} from './catalog-location';
/** Scope every batch to its actual canonical landing page, including future topics. */
export function catalogParameters(location:CatalogLocation,search:URLSearchParams){
 const params=new URLSearchParams(search);const {collection,topic,number}=location;
 for(const key of ['source','__fragment'])params.delete(key);
 params.delete('category');params.delete('subcategory');params.delete('collection');params.delete('number');
 if(collection)params.set('collection',collection.id);
 else if(topic){params.set('category',topic.parent||topic.id);if(topic.parent)params.set('subcategory',topic.id);}
 if(number){params.set('category','education');params.set('subcategory','numbers');params.set('number',String(number.number));}
 params.set('limit','12');if(params.has('cursor'))params.delete('page');return params;
}

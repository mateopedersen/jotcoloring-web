import {ageBand} from '../age/model';
import {catalogLocation} from './catalog-location';
import {catalogParameters} from './catalog-query';
/** Bind continuation to the canonical collection, never to a client-supplied
 * category/age override. The signed cursor still verifies the complete query. */
export function streamQuery(source:string,search:URLSearchParams){
 const location=/^\/(?:coloring-pages|collections)\//.test(source)?catalogLocation(source):undefined;
 if(location&&location.path===source)return {params:catalogParameters(location,search),showCategory:!location.topic&&!location.number};
 const match=/^\/coloring-by-age\/([^/]+)\/$/.exec(source),band=match&&ageBand(match[1]);
 if(!band)throw Error('Choose a collection to continue.');
 const params=new URLSearchParams(search);params.delete('source');params.set('recommended_age',band.id);params.set('limit','12');if(params.has('cursor'))params.delete('page');
 return {params,showCategory:true};
}

import {COLORING_TAXONOMY,categoryPath} from './catalog';
import {NAVIGATION_COLLECTIONS,collectionPath} from './navigation';
/** Previous public addresses remain one-hop aliases; no artwork identity changes. */
export function legacyCatalogRedirects(){
 const pairs=COLORING_TAXONOMY.flatMap(c=>[
  {path:'/coloring-pages/'+c.id+'/',target:categoryPath(c.id)},
  ...(c.parent?[{path:'/coloring-pages/'+c.parent+'/'+c.id+'/',target:categoryPath(c.id)}]:[{path:'/collection/'+c.id+'/',target:categoryPath(c.id)}])
 ]);
 for(const c of NAVIGATION_COLLECTIONS)pairs.push({path:'/collection/'+c.id+'/',target:collectionPath(c.id)},{path:'/coloring-pages/'+c.id+'/',target:collectionPath(c.id)});
 pairs.push({path:'/coloring-pages/animals/dinosaurs/',target:categoryPath('dinosaurs')});
 return [...new Map(pairs.filter(pair=>pair.path!==pair.target).map(pair=>[pair.path,pair])).values()];
}

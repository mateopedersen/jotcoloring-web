import prepared from '../social/navigation-generated.json';
import {catalogLocation} from '../taxonomy/catalog-location';import {landingIdentity} from '../taxonomy/landing-identity';
import {canonicalJSON,sha256} from './http';
import type {Env} from './types';
export interface NavigationCard {src:string;alt:string;title:string;description:string;sha256:string;identity_sha256:string;sources:{id:string;sha256:string}[]}
/** Image/metadata replacement or archive invalidates the prepared cover. */
export async function validatedNavigationCard(env:Env,path:string,candidate=(prepared as Record<string,NavigationCard>)[path]){
 const view=catalogLocation(path);if(!view||view.path!==path||!candidate||!env.CATALOG_DB)return;
 const identity=landingIdentity(view);if(candidate.title!==identity.heading||candidate.description!==identity.intro||candidate.identity_sha256!==await sha256(canonicalJSON(identity))||!candidate.sources?.length||candidate.sources.length>3)return;
 if(!/^https:\/\/assets\.jotcoloring\.com\/published\/navigation\/v1\/[a-f0-9]{64}\.png$/.test(candidate.src)||!candidate.src.includes(candidate.sha256))return;
 let rows:{id:string;sha256:string}[];try{rows=(await env.CATALOG_DB.prepare("SELECT c.id,a.sha256 FROM content c INDEXED BY sqlite_autoindex_content_1 JOIN asset a ON a.content_id=c.id AND a.content_version=c.active_version AND a.role='printable_webp_bw' AND a.verified=1 WHERE c.status='published' AND c.id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(candidate.sources.map(s=>s.id))).all<{id:string;sha256:string}>()).results;}catch{return;}
 if(candidate.sources.some(source=>!rows.some(row=>row.id===source.id&&row.sha256===source.sha256)))return;
 return candidate;
}

import registry from './responsive-assets.json';
export interface DisplayCopy {key:string;sha256:string;bytes:number;width:number;height:number}
export interface DisplaySource {source_sha256:string;source_role:string;copies:DisplayCopy[]}
// Finite, byte-verified migration of the existing catalog. New imports publish
// responsive asset roles normally. Replacing source bytes invalidates this lookup.
const bySource=new Map((registry as DisplaySource[]).map(row=>[row.source_role+':'+row.source_sha256,row.copies]));
export function displayCopies(sha:string,role:string):DisplayCopy[]{return bySource.get(role+':'+sha)||[];}

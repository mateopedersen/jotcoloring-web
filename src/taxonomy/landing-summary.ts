import {landingIdentity} from './landing-identity';
import type {CatalogLocation} from './catalog-location';
import guidance from './landing-guidance.json';
import numberGuidance from './number-guidance.json';

/** Accepted catalog evidence plus visitor guidance, never invented artwork facts.
 * A future topic immediately retains its own reviewed intro. Coloring advice is
 * separate from source observations and never changes source-bound metadata.
 */
export function landingSummary(location:CatalogLocation){
 const identity=landingIdentity(location),key=location.collection?.id||location.topic?.id||'all';
 if(!location.collection&&!location.topic&&!location.number)return identity.intro;
 const notes=location.number?(numberGuidance as Record<string,string>)[location.number.number]:(guidance as Record<string,string>)[key];
 const fallback=`Explore ${identity.heading.replace(/ coloring pages$/i,'').toLowerCase()} at your own pace and choose the drawing that interests you most. Compare the complete outlines before deciding where to begin. You can start with a small palette for the largest shapes, then add contrast to the details you want to highlight.`;
 const advice=notes||fallback,stop=advice.indexOf('. '),opening=stop<0?advice:advice.slice(0,stop+1),rest=stop<0?'':advice.slice(stop+2);
 return [opening,identity.intro,rest].filter(Boolean).join(' ').replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim().replace(/([^.!?])$/,'$1.');
}

import {landingIdentity} from './landing-identity';
import type {CatalogLocation} from './catalog-location';
import introductions from './landing-introductions.json';

export interface LandingIntroduction {sourceIntro:string;text:string}
const copy=introductions as Record<string,LandingIntroduction>;

export function landingIntroductionKey(location:CatalogLocation){
 return location.number?`number:${location.number.number}`:location.collection?`collection:${location.collection.id}`:location.topic?`topic:${location.topic.id}`:undefined;
}

/** The accepted short identity continues to bind SEO and social artwork. The
 * separately authored visible introduction explains this actual collection.
 * No automatic palette advice, word-count padding, or invented artwork facts.
 */
export function reviewedLandingIntroduction(location:CatalogLocation){
 const key=landingIntroductionKey(location),entry=key?copy[key]:undefined;
 return entry?.sourceIntro===landingIdentity(location).intro?entry:undefined;
}

export function landingSummary(location:CatalogLocation){
 // A replaced source intro invalidates its old visible copy. Release checks
 // require a reviewed replacement; a running page still shows current facts.
 return reviewedLandingIntroduction(location)?.text||landingIdentity(location).intro;
}

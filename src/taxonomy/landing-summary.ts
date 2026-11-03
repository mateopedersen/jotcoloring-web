import {landingIdentity} from './landing-identity';
import type {CatalogLocation} from './catalog-location';

/** Condense accepted topic copy without fabricating observations about its art.
 * The complete introduction remains the metadata source. Counts come from the
 * current catalog query, never a fixed package or promotional total.
 */
export function landingSummary(location:CatalogLocation){
 const intro=landingIdentity(location).intro;
 const first=intro.match(/^.*?[.!?](?=\s|$)/)?.[0]||intro;
 return first.replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim().replace(/([^.!?])$/,'$1.');
}

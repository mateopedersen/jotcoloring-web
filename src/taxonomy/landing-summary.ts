import {landingIdentity} from './landing-identity';
import type {CatalogLocation} from './catalog-location';

/** Use the complete accepted topic introduction without inventing artwork details.
 * The complete introduction remains the metadata source. Counts come from the
 * current catalog query, never a fixed package or promotional total.
 */
export function landingSummary(location:CatalogLocation){
 const intro=landingIdentity(location).intro;
 return intro.replace(/[-–—]/g,' ').replace(/\s+/g,' ').trim().replace(/([^.!?])$/,'$1.');
}

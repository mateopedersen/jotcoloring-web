import {ADVERTISING_DELIVERY_ENABLED} from './config';
export const APPROVED_ADVERTISING_ORIGIN='https://jotcoloring.com';
export const isApprovedAdvertisingOrigin=(origin:string)=>origin===APPROVED_ADVERTISING_ORIGIN;
export const ADVERTISING_CHOICE_KEY = 'jotcoloring:optional-advertising';
export const ADVERTISING_CHOICE_LIFETIME = 180 * 86400000;
export type AdultChoice = 'unknown' | 'adult' | 'under18' | 'private';
export interface AdvertisingChoice {version:1;allowed:boolean;savedAt:number;expiresAt:number}
/** Public HTML also requires a real shared-layout slot; bytes and APIs never qualify. */
export function permitsAdvertising(pathname:string,search:string='',hash:string='',deliveryEnabled:boolean=ADVERTISING_DELIVERY_ENABLED){return deliveryEnabled&&!search&&!hash&&/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(pathname)&&!/^\/(?:api|admin|_)(?:\/|$)/i.test(pathname);}
export function advertisingChoice(allowed:boolean,now=Date.now()):AdvertisingChoice{return{version:1,allowed,savedAt:now,expiresAt:now+ADVERTISING_CHOICE_LIFETIME};}
export function parseAdvertisingChoice(raw:string|null,now=Date.now()):AdvertisingChoice|undefined{
 try{const c=JSON.parse(raw||'null');if(c?.version!==1||typeof c.allowed!=='boolean'||!Number.isFinite(c.savedAt)||c.savedAt>now||!Number.isFinite(c.expiresAt)||c.expiresAt<=now||c.expiresAt>c.savedAt+ADVERTISING_CHOICE_LIFETIME)return;return c;}catch{return;}
}
/** An explicit adult declaration is tab-session scoped; marketing consent never substitutes for it. */
export function mayRequestAdvertising(pathname:string,adult:AdultChoice,choice:AdvertisingChoice|undefined,search:string='',hash:string='',deliveryEnabled:boolean=ADVERTISING_DELIVERY_ENABLED){return permitsAdvertising(pathname,search,hash,deliveryEnabled)&&adult==='adult'&&choice?.allowed===true;}

export const ADULT_SESSION_KEY='jotcoloring:adult-advertising-session';
export const ADULT_SESSION_LIFETIME=24*60*60*1000;
export interface AdultSession {version:1;adult:true;confirmedAt:number;expiresAt:number}
export function adultSession(now=Date.now()):AdultSession{return{version:1,adult:true,confirmedAt:now,expiresAt:now+ADULT_SESSION_LIFETIME};}
export function parseAdultSession(raw:string|null,now=Date.now()):AdultSession|undefined{try{const value=JSON.parse(raw||'null');if(value?.version!==1||value.adult!==true||Object.keys(value).sort().join(',')!=='adult,confirmedAt,expiresAt,version'||!Number.isFinite(value.confirmedAt)||value.confirmedAt>now||!Number.isFinite(value.expiresAt)||value.expiresAt<=now||value.expiresAt>value.confirmedAt+ADULT_SESSION_LIFETIME)return;return value;}catch{return;}}

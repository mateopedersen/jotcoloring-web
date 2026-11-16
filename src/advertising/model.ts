export const APPROVED_ADVERTISING_ORIGIN='https://jotcoloring.com';
export const isApprovedAdvertisingOrigin=(origin:string)=>origin===APPROVED_ADVERTISING_ORIGIN;
export const ADVERTISING_CHOICE_KEY = 'jotcoloring:optional-advertising';
export const ADVERTISING_CHOICE_LIFETIME = 180 * 86400000;
export type AdultChoice = 'unknown' | 'adult' | 'under18' | 'private';
export interface AdvertisingChoice {version:1;allowed:boolean;savedAt:number;expiresAt:number}
const ADULT_ADVERTISING_PATHS = new Set(['/coloring-by-age/adults/']);
/** Deliberately excludes mixed-age galleries, artwork, downloads, and creation tools. */
export function permitsAdvertising(pathname:string,search:string='',hash:string=''){return !search&&!hash&&ADULT_ADVERTISING_PATHS.has(pathname);}
export function advertisingChoice(allowed:boolean,now=Date.now()):AdvertisingChoice{return{version:1,allowed,savedAt:now,expiresAt:now+ADVERTISING_CHOICE_LIFETIME};}
export function parseAdvertisingChoice(raw:string|null,now=Date.now()):AdvertisingChoice|undefined{
 try{const c=JSON.parse(raw||'null');if(c?.version!==1||typeof c.allowed!=='boolean'||!Number.isFinite(c.savedAt)||c.savedAt>now||!Number.isFinite(c.expiresAt)||c.expiresAt<=now||c.expiresAt>c.savedAt+ADVERTISING_CHOICE_LIFETIME)return;return c;}catch{return;}
}
/** Age stays in page memory; a stored marketing choice never substitutes for it. */
export function mayRequestAdvertising(pathname:string,adult:AdultChoice,choice:AdvertisingChoice|undefined,search:string='',hash:string=''){return permitsAdvertising(pathname,search,hash)&&adult==='adult'&&choice?.allowed===true;}

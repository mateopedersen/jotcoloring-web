export const NOTICE_KEY='jotcoloring:privacy-choice';
export const NOTICE_VERSION=1;
export const NOTICE_LIFETIME=180*86400000;
export interface NoticeChoice {version:1;essentialOnly:true;savedAt:number;expiresAt:number}
export function newChoice(now=Date.now()):NoticeChoice{return{version:NOTICE_VERSION,essentialOnly:true,savedAt:now,expiresAt:now+NOTICE_LIFETIME};}
export function parseChoice(raw:string|null,now=Date.now()):NoticeChoice|undefined{try{const c=JSON.parse(raw||'null');if(c?.version!==NOTICE_VERSION||c.essentialOnly!==true||!Number.isFinite(c.savedAt)||c.savedAt>now||!Number.isFinite(c.expiresAt)||c.expiresAt<=now||c.expiresAt>c.savedAt+NOTICE_LIFETIME)return;return c;}catch{return;}}
export function shouldShowNotice(country:string|undefined,choice:NoticeChoice|undefined){return country?.toUpperCase()!=='US'&&!choice;}

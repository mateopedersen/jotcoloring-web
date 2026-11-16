export interface BannerUnit {key:string;scriptURL:string;width:300;height:250;format:'iframe';params:Record<string,never>}
// Copied from JotColoring's active 300x250 publisher unit on November 16, 2026.
export const ADVERTISING_UNIT:BannerUnit={key:"7ce5e5b1840414e230cd786c62a0c9e2",scriptURL:"https://bellnewyork.org/22/7ce5e5b1840414e230cd786c62a0c9e2",width:300,height:250,format:'iframe',params:{}};
export const ADVERTISING_PROVIDER_ORIGIN=new URL(ADVERTISING_UNIT.scriptURL).origin;

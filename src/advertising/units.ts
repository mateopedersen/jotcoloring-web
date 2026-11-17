export interface BannerUnit {key:string;scriptURL:string;width:300|728;height:250|90;format:'js';container:string;params:Record<string,never>}
// Exact tags captured from the active publisher units, November 17, 2026 (official JS ASYNC, enabled by publisher support).
export const ADVERTISING_UNIT:BannerUnit={key:'7ce5e5b1840414e230cd786c62a0c9e2',scriptURL:'https://bellnewyork.org/22/7ce5e5b1840414e230cd786c62a0c9e2',width:300,height:250,format:'js',container:'atContainer-7ce5e5b1840414e230cd786c62a0c9e2',params:{}};
export const ADVERTISING_DESKTOP_UNIT:BannerUnit={key:'78c4e99cb72ba6f59bac35b7b4a8e57f',scriptURL:'https://bellnewyork.org/22/78c4e99cb72ba6f59bac35b7b4a8e57f',width:728,height:90,format:'js',container:'atContainer-78c4e99cb72ba6f59bac35b7b4a8e57f',params:{}};
export const ADVERTISING_PROVIDER_ORIGIN=new URL(ADVERTISING_UNIT.scriptURL).origin;
export function selectAdvertisingUnit(width:number):BannerUnit|undefined{return Number.isFinite(width)&&width>=728?ADVERTISING_DESKTOP_UNIT:Number.isFinite(width)&&width>=300?ADVERTISING_UNIT:undefined;}

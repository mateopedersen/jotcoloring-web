import {ADVERTISING_CHOICE_KEY,ADULT_SESSION_KEY,adultSession,parseAdultSession,advertisingChoice,parseAdvertisingChoice,mayRequestAdvertising,isApprovedAdvertisingOrigin,type AdultChoice} from './model';
import {selectAdvertisingUnit} from './units';

declare global {interface Window {atOptions?:{key:string;format:'iframe';height:number;width:number;params:Record<string,never>};JotAdvertising?:{apply:(age:AdultChoice,allowed:boolean)=>Promise<boolean>;off:()=>Promise<boolean>;adult:()=>boolean;allowed:()=>boolean|undefined}}}
export function mountOptionalAdvertisement(){
 const slot=document.querySelector<HTMLElement>('[data-advertising-slot]');if(!slot||slot.dataset.advertisingMounted)return;slot.dataset.advertisingMounted='true';
 const stage=slot.querySelector<HTMLElement>('[data-advertising-stage]')!,status=slot.querySelector<HTMLElement>('[data-advertising-status]')!,pending=slot.querySelector<HTMLElement>('[data-advertising-pending]')!,confirmation=slot.querySelector<HTMLDialogElement>('[data-advertising-confirm]')!;
 let memory:string|null=null,adultMemoryUntil=0,requested=false,inView=false,formEdited=false,reloadRequested=false,approvedReload=false,loadedWidth=0,expiryTimer:ReturnType<typeof setTimeout>|undefined;
 const read=()=>{try{return memory||localStorage.getItem(ADVERTISING_CHOICE_KEY);}catch{return memory;}};
 const current=()=>parseAdvertisingChoice(read());
 const availableWidth=()=>{const parent=slot.parentElement!;const style=getComputedStyle(parent);return Math.min(parent.clientWidth-parseFloat(style.paddingLeft||'0')-parseFloat(style.paddingRight||'0'),innerWidth-20);};
 const adult=()=>{try{return !!parseAdultSession(sessionStorage.getItem(ADULT_SESSION_KEY))||adultMemoryUntil>Date.now();}catch{return adultMemoryUntil>Date.now();}};
 const changed=()=>document.dispatchEvent(new Event('jot:advertising-choice'));
 const save=(allowed:boolean)=>{memory=JSON.stringify(advertisingChoice(allowed));try{localStorage.setItem(ADVERTISING_CHOICE_KEY,memory);}catch{/* The choice remains usable on this page only. */}changed();};
 const forgetAdult=()=>{adultMemoryUntil=0;if(expiryTimer)clearTimeout(expiryTimer);try{sessionStorage.removeItem(ADULT_SESSION_KEY);}catch{}};
 // Observe only a boolean, never a field value, upload, artwork or serialized form.
 const edited=(event:Event)=>{const target=event.target;if(target instanceof Element&&!target.closest('[data-advertising-slot],[data-storage-notice],[data-storage-dialog]')&&target.closest('form,[contenteditable="true"]'))formEdited=true;};
 document.addEventListener('input',edited);document.addEventListener('change',edited);
 const dirty=()=>formEdited||!!document.querySelector('.jc-studio [data-save-state][data-state="dirty"],.jc-studio [data-save-state][data-state="saving"],.jc-studio [data-save-state][data-state="error"]');
 const showPending=()=>{slot.hidden=false;stage.replaceChildren();stage.hidden=true;pending.hidden=false;status.textContent='Optional cookies are off. Reload after saving your work to finish stopping previously loaded code.';};
 const reloadLoaded=()=>{if(reloadRequested)return;reloadRequested=true;showPending();location.reload();};
 window.addEventListener('beforeunload',event=>{if(reloadRequested&&dirty()&&!approvedReload){event.preventDefault();event.returnValue='';}});
 const confirmWithdrawal=()=>new Promise<boolean>(resolve=>{const opener=document.activeElement instanceof HTMLElement?document.activeElement:undefined;let finished=false;const finish=(yes:boolean)=>{if(finished)return;finished=true;confirmation.removeEventListener('click',clicked);confirmation.removeEventListener('cancel',cancelled);confirmation.close();if(opener?.isConnected)opener.focus({preventScroll:true});resolve(yes);};const clicked=(event:Event)=>{const button=(event.target as Element).closest('button');if(button?.hasAttribute('data-advertising-confirm-reload'))finish(true);else if(button?.hasAttribute('data-advertising-cancel-reload'))finish(false);};const cancelled=(event:Event)=>{event.preventDefault();finish(false);};confirmation.addEventListener('click',clicked);confirmation.addEventListener('cancel',cancelled);confirmation.showModal();confirmation.querySelector<HTMLButtonElement>('[data-advertising-cancel-reload]')?.focus({preventScroll:true});});
 const off=async()=>{if(requested&&dirty()&&!await confirmWithdrawal())return false;approvedReload=true;forgetAdult();save(false);stage.hidden=true;status.textContent='';if(requested)reloadLoaded();return true;};
 const load=()=>{
  if(requested||reloadRequested||!inView||document.visibilityState!=='visible'||!mayRequestAdvertising(location.pathname,adult()?'adult':'unknown',current(),location.search,location.hash))return;
  if(!isApprovedAdvertisingOrigin(location.origin)){slot.dataset.advertisingPreview='true';return;}
  const unit=selectAdvertisingUnit(availableWidth());if(!unit)return;requested=true;loadedWidth=unit.width;slot.dataset.advertisingFormat=unit.width===728?'desktop':'mobile';slot.dataset.advertisingRequested='true';stage.style.width=unit.width+'px';stage.style.minHeight=unit.height+'px';stage.hidden=false;status.textContent='Loading advertisement…';
  // This retained legacy controller uses the original synchronous iframe tag.
  window.atOptions={key:unit.key,format:'iframe',height:unit.height,width:unit.width,params:unit.params};
  const script=document.createElement('script');script.type='text/javascript';script.src=unit.scriptURL;
  script.addEventListener('load',()=>{if(!reloadRequested)status.textContent='';},{once:true});
  script.addEventListener('error',()=>{stage.replaceChildren();stage.hidden=true;if(!reloadRequested)status.textContent='The advertisement is unavailable. You can keep browsing.';},{once:true});stage.append(script);
 };
 const schedule=()=>{if(document.readyState!=='complete'){window.addEventListener('load',schedule,{once:true});return;}if('requestIdleCallback' in window)window.requestIdleCallback(load,{timeout:1500});else setTimeout(load,0);};
 const startExpiry=()=>{if(expiryTimer)clearTimeout(expiryTimer);let expiresAt=Date.now()+24*60*60*1000;try{expiresAt=parseAdultSession(sessionStorage.getItem(ADULT_SESSION_KEY))?.expiresAt||expiresAt;}catch{}expiryTimer=setTimeout(()=>{forgetAdult();changed();if(requested){approvedReload=false;reloadLoaded();}},Math.max(0,expiresAt-Date.now()));};
 const apply=async(age:AdultChoice,allowed:boolean)=>{if(!allowed||age==='under18'||age==='private')return off();if(age!=='adult')return false;adultMemoryUntil=Date.now()+24*60*60*1000;try{sessionStorage.setItem(ADULT_SESSION_KEY,JSON.stringify(adultSession()));}catch{}startExpiry();save(true);schedule();return true;};
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);if(inView)schedule();},{rootMargin:'200px 0px'});observer.observe(slot);}else{inView=true;schedule();}
 slot.querySelector('[data-advertising-reload]')?.addEventListener('click',()=>location.reload());
 window.addEventListener('resize',()=>{if(reloadRequested)return;if(requested)slot.hidden=availableWidth()<loadedWidth;else schedule();});
 document.addEventListener('jot:advertising-revoked',()=>{void off();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(requested&&!adult()){approvedReload=false;reloadLoaded();}else schedule();}});
 window.addEventListener('storage',event=>{if(event.key!==ADVERTISING_CHOICE_KEY&&event.key!==null)return;memory=event.key===null?null:event.newValue;changed();if(current()?.allowed!==true){forgetAdult();if(requested){approvedReload=false;reloadLoaded();}else{stage.hidden=true;status.textContent='';}}});
 window.JotAdvertising={apply,off,adult,allowed:()=>current()?.allowed};if(adult())startExpiry();document.dispatchEvent(new Event('jot:advertising-ready'));schedule();
}

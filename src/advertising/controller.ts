import {ADVERTISING_CHOICE_KEY,advertisingChoice,parseAdvertisingChoice,mayRequestAdvertising,isApprovedAdvertisingOrigin,type AdultChoice} from './model';
import {ADVERTISING_UNIT} from './units';

declare global {interface Window {atOptions?:{key:string;format:'iframe';height:number;width:number;params:Record<string,never>}}}
export function mountOptionalAdvertisement(){
 const slot=document.querySelector<HTMLElement>('[data-advertising-slot]'),unit=ADVERTISING_UNIT;if(!slot||!unit||slot.dataset.advertisingMounted)return;slot.dataset.advertisingMounted='true';
 const gate=slot.querySelector<HTMLElement>('[data-advertising-gate]')!,ageStep=slot.querySelector<HTMLElement>('[data-advertising-age-step]')!,consentStep=slot.querySelector<HTMLElement>('[data-advertising-consent-step]')!,stage=slot.querySelector<HTMLElement>('[data-advertising-stage]')!,status=slot.querySelector<HTMLElement>('[data-advertising-status]')!,settings=slot.querySelector<HTMLButtonElement>('[data-advertising-settings]')!,controls=slot.querySelector<HTMLElement>('[data-advertising-controls]')!;
 settings.disabled=false;
 let adult:AdultChoice='unknown',memory:string|null=null,requested=false,inView=false;
 const read=()=>{try{return localStorage.getItem(ADVERTISING_CHOICE_KEY)||memory;}catch{return memory;}};
 const save=(allowed:boolean)=>{memory=JSON.stringify(advertisingChoice(allowed));try{localStorage.setItem(ADVERTISING_CHOICE_KEY,memory);}catch{/* The choice remains usable on this page only. */}};
 const close=()=>{gate.hidden=true;settings.setAttribute('aria-expanded','false');settings.focus({preventScroll:true});};
 const load=()=>{
  if(requested||!inView||document.visibilityState!=='visible'||!mayRequestAdvertising(location.pathname,adult,parseAdvertisingChoice(read()),location.search,location.hash))return;
  if(!isApprovedAdvertisingOrigin(location.origin)){slot.dataset.advertisingPreview='true';status.textContent='Preview: advertising choices work here. Provider code loads only on jotcoloring.com.';controls.hidden=false;return;}
  requested=true;slot.dataset.advertisingRequested='true';stage.hidden=false;status.textContent='Loading optional advertisement…';controls.hidden=false;
  // Keep the provider options and tag URL unchanged; no proxy or iframe wrapper.
  window.atOptions={key:unit.key,format:unit.format,height:unit.height,width:unit.width,params:unit.params};
  const script=document.createElement('script');script.type='text/javascript';script.src=unit.scriptURL;
  script.addEventListener('load',()=>{status.textContent='Optional advertising is enabled.';},{once:true});
  script.addEventListener('error',()=>{stage.replaceChildren();stage.hidden=true;status.textContent='The optional advertisement is unavailable. You can keep browsing.';},{once:true});
  stage.append(script);
 };
 const schedule=()=>{if(document.readyState!=='complete'){window.addEventListener('load',schedule,{once:true});return;}if('requestIdleCallback' in window)window.requestIdleCallback(load,{timeout:1500});else setTimeout(load,0);};
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{inView=entries.some(e=>e.isIntersecting);if(inView)schedule();},{rootMargin:'200px 0px'});observer.observe(slot);}else inView=true;
 settings.addEventListener('click',()=>{gate.hidden=!gate.hidden;settings.setAttribute('aria-expanded',String(!gate.hidden));if(!gate.hidden){ageStep.hidden=adult==='adult';consentStep.hidden=adult!=='adult';gate.querySelector<HTMLButtonElement>('div:not([hidden]) button')?.focus({preventScroll:true});}});
 slot.addEventListener('click',event=>{
  const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
  const age=button.dataset.advertisingAge;if(age){adult=age as AdultChoice;if(adult!=='adult'){close();status.textContent='Optional ads stay off. You can keep browsing without them.';return;}if(parseAdvertisingChoice(read())?.allowed===true){close();status.textContent='Your saved optional-advertising choice applies to this visit. You can turn it off at any time.';schedule();return;}ageStep.hidden=true;consentStep.hidden=false;consentStep.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});return;}
  if(button.hasAttribute('data-advertising-deny')){save(false);if(requested){location.reload();return;}controls.hidden=true;stage.hidden=true;close();status.textContent='Optional ads are off. Your coloring pages and tools remain available.';return;}
  if(button.hasAttribute('data-advertising-allow')){if(adult!=='adult')return;save(true);close();schedule();}
  if(button.hasAttribute('data-advertising-revoke')){save(false);location.reload();}
 });
 document.addEventListener('jot:advertising-revoked',()=>{save(false);adult='unknown';if(requested)location.reload();else{controls.hidden=true;stage.hidden=true;stage.replaceChildren();close();status.textContent='Optional ads are off. Your coloring pages and tools remain available.';}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
 window.addEventListener('storage',event=>{if(event.key===ADVERTISING_CHOICE_KEY&&requested&&parseAdvertisingChoice(read())?.allowed!==true)location.reload();});
}

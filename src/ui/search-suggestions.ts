import {illustrationHref,ICON_VIEWBOX} from '../icons/registry';
import type {SearchMatch} from '../search/intent';
import {categories} from './categories';
import {LatestRequest} from './latest-request';
import {buildSuggestions,type Suggestion} from './search-suggestions-model';

export function initSearchSuggestions(){
 const cache=new Map<string,{at:number;items:Suggestion[];total:number;match?:SearchMatch}>();
 for(const form of document.querySelectorAll<HTMLFormElement>('[data-search-form]')){
  if(form.dataset.searchReady)continue;
  const input=form.querySelector<HTMLInputElement>('input[name=q]'),clear=form.querySelector<HTMLButtonElement>('[data-search-clear]'),panel=form.querySelector<HTMLElement>('[data-search-panel]'),list=panel?.querySelector<HTMLElement>('[role=listbox]'),status=panel?.querySelector<HTMLElement>('[data-search-status]');
  if(!input||!clear||!panel||!list||!status)continue;
  form.dataset.searchReady='true';input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',list.id);input.setAttribute('aria-expanded','false');input.setAttribute('aria-haspopup','listbox');
  const requests=new LatestRequest();let timer:ReturnType<typeof setTimeout>|undefined,active=-1,composing=false;
  const syncClear=()=>{clear.hidden=!input.value;};
  const fitPanel=()=>{if(panel.hidden)return;const rect=form.getBoundingClientRect(),viewport=window.visualViewport,top=viewport?.offsetTop||0,bottom=top+(viewport?.height||innerHeight),below=bottom-rect.bottom-22,above=rect.top-top-22,useAbove=below<220&&above>below;panel.classList.toggle('is-above',useAbove);panel.style.maxHeight=Math.max(115,Math.min(540,useAbove?above:below))+'px';};
  window.addEventListener('resize',fitPanel,{passive:true});window.addEventListener('scroll',fitPanel,{passive:true,capture:true});window.visualViewport?.addEventListener('resize',fitPanel,{passive:true});
  const close=()=>{clearTimeout(timer);requests.cancel();panel.hidden=true;panel.setAttribute('aria-busy','false');input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
  const show=(items:Suggestion[],query:string,failed=false,total=0,match?:SearchMatch)=>{
   const options:HTMLAnchorElement[]=[];
   for(const [index,item] of items.entries()){
    const link=document.createElement('a');link.href=item.href;link.id=`${list.id}-${index}`;link.setAttribute('role','option');link.setAttribute('aria-selected','false');link.tabIndex=-1;link.className='jc-search-option';link.dataset.suggestionKind=item.kind;
    if(item.thumbnail){const image=document.createElement('img');image.src=item.thumbnail;image.alt='';image.width=48;image.height=48;link.append(image);}
    else if(item.category){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');svg.setAttribute('viewBox',ICON_VIEWBOX);svg.setAttribute('aria-hidden','true');use.setAttribute('href',illustrationHref(item.category));svg.append(use);link.append(svg);}
    else {const blank=document.createElement('span');blank.className='jc-search-placeholder';blank.setAttribute('aria-hidden','true');link.append(blank);}
    const text=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=item.title;detail.textContent=item.detail;text.append(title,detail);if(item.description){const description=document.createElement('span');description.className='jc-search-description';description.textContent=item.description;text.append(description);}link.append(text);options.push(link);
   }
   const all=document.createElement('a');const target=new URL(form.action,location.href);target.searchParams.set('q',query);if(form.dataset.recommendedAge)target.searchParams.set('recommended_age',form.dataset.recommendedAge);all.href=target.pathname+target.search+'#catalog-results';all.id=`${list.id}-all`;all.className='jc-search-all';all.setAttribute('role','option');all.setAttribute('aria-selected','false');all.tabIndex=-1;all.textContent=total?`See all ${total.toLocaleString('en-US')} ${total===1?'matching page':'matching pages'} →`:`Search pages for “${query}” →`;const results=document.createElement('div');results.className='jc-search-results';results.append(...options);list.replaceChildren(results,all);
   status.textContent=failed?'Suggestions are unavailable. You can still search all pages.':match?.mode==='corrected'?`Showing “${match.interpreted}” · ${total.toLocaleString('en-US')} ${total===1?'page':'pages'}`:total?`${total.toLocaleString('en-US')} ${total===1?'matching coloring page':'matching coloring pages'}`:items.length?'Explore a collection':'No close matches yet. Try a subject such as fox or flower.';
   panel.hidden=false;fitPanel();input.setAttribute('aria-expanded','true');active=-1;input.removeAttribute('aria-activedescendant');
  };
  const suggest=()=>{
   syncClear();close();const query=input.value.trim();if(composing||query.length<2)return;
   timer=setTimeout(()=>{
    panel.hidden=false;fitPanel();panel.setAttribute('aria-busy','true');input.setAttribute('aria-expanded','true');status.textContent='Searching...';list.replaceChildren();
    void requests.run(async signal=>{
     const params=new URLSearchParams({q:query,limit:'5'});if(form.dataset.recommendedAge)params.set('recommended_age',form.dataset.recommendedAge);const saved=cache.get(params.toString());if(saved&&Date.now()-saved.at<15000)return saved;const response=await fetch(`/api/search?${params}`,{signal});if(!response.ok)throw new Error('Search unavailable');const data=await response.json();if(!Array.isArray(data.items))throw new Error('Search results unavailable');const result={at:Date.now(),items:buildSuggestions(data.search_match?.mode==='corrected'?data.search_match.interpreted:query,data.items,categories),total:Number(data.total)||0,match:data.search_match as SearchMatch|undefined};cache.set(params.toString(),result);if(cache.size>24)cache.delete(cache.keys().next().value!);return result;
    },data=>{if(document.activeElement===input)show(data.items,query,false,data.total,data.match);},()=>{if(document.activeElement===input)show([],query,true);},()=>panel.setAttribute('aria-busy','false'));
   },140);
  };
  input.addEventListener('input',suggest);input.addEventListener('focus',suggest);
  input.addEventListener('compositionstart',()=>{composing=true;close();});input.addEventListener('compositionend',()=>{composing=false;suggest();});
  input.addEventListener('keydown',event=>{
   if(panel.hidden)return;const links=[...list.querySelectorAll<HTMLAnchorElement>('[role=option]')];
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
   if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
    if(!links.length)return;event.preventDefault();active=event.key==='Home'?0:event.key==='End'?links.length-1:active<0?(event.key==='ArrowDown'?0:links.length-1):(active+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
    links.forEach((link,index)=>link.setAttribute('aria-selected',String(index===active)));input.setAttribute('aria-activedescendant',links[active].id);links[active].scrollIntoView({block:'nearest'});
   }
   if(event.key==='Enter'&&active>=0){event.preventDefault();location.assign(links[active].href);}
  });
  clear.addEventListener('click',()=>{input.value='';syncClear();close();input.focus();});
  form.addEventListener('submit',event=>{close();input.value=input.value.trim();if(!input.value){event.preventDefault();location.assign('/coloring-pages/');}});
  form.addEventListener('focusout',event=>{if(event.relatedTarget instanceof Node&&!form.contains(event.relatedTarget))close();});
  document.addEventListener('focusin',event=>{if(!form.contains(event.target as Node))close();});
  document.addEventListener('pointerdown',event=>{if(!form.contains(event.target as Node))close();});
  window.addEventListener('pagehide',close);window.addEventListener('pageshow',close);syncClear();
 }
}

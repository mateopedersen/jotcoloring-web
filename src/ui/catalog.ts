import {difficultyLabel} from '../age/difficulty';
import {artworkText} from './artwork-text';
import type {Content} from '../server/types';
import {selectFilterURL} from './filter-url';
import {LatestRequest} from './latest-request';
for(const input of document.querySelectorAll<HTMLInputElement>('input[data-filter]'))input.addEventListener('change',()=>{
 const name=input.dataset.filter;if(name!=='age'&&name!=='difficulty')return;
 const values=[...document.querySelectorAll<HTMLInputElement>(`input[data-filter="${name}"]:checked`)].map(el=>el.value);
 location.assign(selectFilterURL(location.href,name,values).href);
});
for(const select of document.querySelectorAll<HTMLSelectElement>('[data-filter-select]'))select.addEventListener('change',()=>{
 const name=select.name;if(!['category','age','recommended_age','difficulty','sort'].includes(name))return;
 location.assign(selectFilterURL(location.href,name as 'category'|'age'|'recommended_age'|'difficulty'|'sort',[select.value]).href);
});

// Until the listeners are ready, the real GET submit button stays available.
// If a visitor already chose an option during loading, apply that choice.
const form=document.querySelector<HTMLFormElement>('#catalog-filters');
const apply=form?.querySelector<HTMLButtonElement>('[data-apply-filters]');
const pending=[...document.querySelectorAll<HTMLSelectElement>('[data-filter-select]')].filter(select=>{
 const initial=[...select.options].find(option=>option.defaultSelected)||select.options[0];
 return initial&&select.value!==initial.value;
});
if(pending.length){
 let next=new URL(location.href);
 for(const select of pending)if(['category','age','recommended_age','difficulty','sort'].includes(select.name))next=selectFilterURL(next.href,select.name as 'category'|'age'|'recommended_age'|'difficulty'|'sort',[select.value]);
 location.assign(next.href);
}else if(apply)apply.hidden=true;
const requests=new LatestRequest();
for(const button of document.querySelectorAll<HTMLButtonElement>('.select-preview'))button.addEventListener('click',()=>{
 const panel=document.querySelector<HTMLElement>('#quick-preview'),body=panel?.querySelector<HTMLElement>('[data-preview-body]'),error=panel?.querySelector<HTMLElement>('[data-preview-error]'),status=panel?.querySelector<HTMLElement>('[data-preview-status]');
 if(!panel||!body||!error||!status)return;
 panel.setAttribute('aria-busy','true');body.inert=true;error.hidden=true;status.hidden=false;status.textContent='Loading preview...';
 void requests.run(async signal=>{
  const response=await fetch(`/api/content/${encodeURIComponent(button.dataset.id!)}?refresh=${Date.now()}`,{signal,cache:'no-store'});
  if(!response.ok)throw new Error('Preview could not load. Choose the page again to retry.');
  const json=await response.json(),item=(json.item||json) as Content;
  if(item.id!==button.dataset.id||typeof item.title!=='string'||typeof item.preview!=='string'||!item.downloads?.pdf||!item.downloads.webp)throw new Error('Preview details are incomplete. Please retry.');
  const image=new Image();image.src=item.preview;
  try{await image.decode();}catch{throw new Error('The preview image could not load. Choose the page again to retry.');}
  signal.throwIfAborted();return item;
 },item=>{
  const image=body.querySelector('img')!;image.src=item.preview;const text=artworkText(item);image.alt=text.alt;image.dataset.imageTitle=text.title;image.dataset.imageDescription=text.description;
  body.querySelector('h3')!.textContent=item.title;
  const badges=body.querySelectorAll('.badge');badges[0].textContent=item.categoryName;badges[1].textContent=difficultyLabel(item.difficulty);
  body.querySelector<HTMLAnchorElement>('a.primary')!.href=`/studio/?page=${encodeURIComponent(item.id)}`;
  for(const link of body.querySelectorAll<HTMLAnchorElement>('[data-file-format]')){
   const format=link.dataset.fileFormat as 'pdf'|'webp';link.dataset.downloadId=item.id;link.href=item.downloads[format];link.download=`${item.slug}.${format}`;link.setAttribute('aria-label',`Download ${item.title} ${format==='webp'?'Image':'PDF'}`);
  }
  for(const card of document.querySelectorAll('.art-card')){
   const selected=card.getAttribute('data-content-id')===item.id;card.classList.toggle('selected',selected);card.querySelector('.select-preview')?.setAttribute('aria-pressed',String(selected));
  }
  body.hidden=false;status.textContent=`Preview: ${item.title}`;
  if(matchMedia('(max-width: 900px)').matches)panel.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 },cause=>{error.textContent=cause instanceof Error?cause.message:'Preview could not load. Please retry.';error.hidden=false;body.hidden=true;status.hidden=true;},()=>{panel.setAttribute('aria-busy','false');body.inert=false;});
});
window.addEventListener('pagehide',()=>{
 requests.cancel();
 const panel=document.querySelector<HTMLElement>('#quick-preview');
 panel?.setAttribute('aria-busy','false');
 const body=panel?.querySelector<HTMLElement>('[data-preview-body]');if(body)body.inert=false;
 const status=panel?.querySelector<HTMLElement>('[data-preview-status]');if(status?.textContent==='Loading preview...')status.hidden=true;
});

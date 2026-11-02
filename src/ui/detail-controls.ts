import {toggleFavorite,isFavorite} from '../studio/storage';
import {toast} from './common';
const favorite=document.querySelector<HTMLButtonElement>('[data-favorite]');
if(favorite){
 const data=JSON.parse(favorite.dataset.favorite!);
 const show=(saved:boolean)=>{favorite.setAttribute('aria-pressed',String(saved));favorite.querySelector('b')!.textContent=saved?'Saved to favorites':'Save to favorites';};
 const refresh=()=>{void isFavorite(data.id).then(show).catch(()=>{});};refresh();
 window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);
 favorite.addEventListener('click',async()=>{favorite.disabled=true;try{show(await toggleFavorite(data));toast(favorite.getAttribute('aria-pressed')==='true'?'Saved to favorites on this device.':'Removed from favorites.');}catch(error){toast(error instanceof Error?error.message:'Favorites could not be saved.');}finally{favorite.disabled=false;}});
}

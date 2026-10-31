import {toggleFavorite,isFavorite} from '../studio/storage';
import {toast} from './common';
const image=document.querySelector<HTMLImageElement>('#detail-image');
const zoomIn=document.querySelector<HTMLButtonElement>('#zoom-in'),zoomOut=document.querySelector<HTMLButtonElement>('#zoom-out'),reset=document.querySelector<HTMLButtonElement>('#zoom-reset');
let zoom=1;
const previewSizes=image?.sizes;
function updateZoom(){
 if(!image)return;
 if(image.srcset)image.sizes=zoom>1?`${Math.ceil((image.parentElement?.clientWidth||600)*zoom)}px`:previewSizes||'600px';
 image.style.width=`${zoom*100}%`;image.style.maxWidth='none';image.style.height='auto';
 const label=document.querySelector('#zoom-label');if(label)label.textContent=`${Math.round(zoom*100)}%`;
 if(zoomIn)zoomIn.disabled=zoom>=3;if(zoomOut)zoomOut.disabled=zoom<=.5;
}
zoomIn?.addEventListener('click',()=>{zoom=Math.min(3,zoom+.25);updateZoom();});
zoomOut?.addEventListener('click',()=>{zoom=Math.max(.5,zoom-.25);updateZoom();});
reset?.addEventListener('click',()=>{zoom=1;updateZoom();});updateZoom();
const favorite=document.querySelector<HTMLButtonElement>('[data-favorite]');
if(favorite){
 const data=JSON.parse(favorite.dataset.favorite!);
 const show=(saved:boolean)=>{favorite.setAttribute('aria-pressed',String(saved));favorite.querySelector('b')!.textContent=saved?'Saved to favorites':'Save to favorites';};
 const refresh=()=>{void isFavorite(data.id).then(show).catch(()=>{});};refresh();
 window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);
 favorite.addEventListener('click',async()=>{favorite.disabled=true;try{show(await toggleFavorite(data));toast(favorite.getAttribute('aria-pressed')==='true'?'Saved to favorites on this device.':'Removed from favorites.');}catch(error){toast(error instanceof Error?error.message:'Favorites could not be saved.');}finally{favorite.disabled=false;}});
}

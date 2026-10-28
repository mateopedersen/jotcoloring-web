for(const slider of document.querySelectorAll<HTMLInputElement>('.compare input'))slider.addEventListener('input',()=>slider.closest<HTMLElement>('.compare')!.style.setProperty('--split',`${slider.value}%`));
const menu=document.querySelector<HTMLDialogElement>('#mobile-menu');
document.querySelector('.hamburger')?.addEventListener('click',()=>{menu?.showModal();document.querySelector('.hamburger')?.setAttribute('aria-expanded','true');});
menu?.querySelector('[data-close-dialog]')?.addEventListener('click',()=>menu.close());
menu?.addEventListener('close',()=>document.querySelector('.hamburger')?.setAttribute('aria-expanded','false'));
export function toast(message:string){const t=document.querySelector<HTMLElement>('#toast');if(t){t.textContent=message;t.hidden=false;setTimeout(()=>t.hidden=true,4500);}}

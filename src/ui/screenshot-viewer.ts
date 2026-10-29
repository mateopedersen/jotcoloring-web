export function mountScreenshotViewer(){
 const dialog=document.querySelector<HTMLDialogElement>('#walkthrough-viewer');
 const screens=[...document.querySelectorAll<HTMLButtonElement>('[data-screen-preview]')];
 if(!dialog||!screens.length)return;
 const image=dialog.querySelector<HTMLImageElement>('[data-screen-image]')!,size=dialog.querySelector<HTMLButtonElement>('[data-screen-size]')!;
 let current=0,opener:HTMLButtonElement|undefined,oldOverflow='';
 function show(index:number){current=(index+screens.length)%screens.length;const button=screens[current],source=button.querySelector('img')!;image.src=button.dataset.screenFull!;image.alt=source.alt;dialog!.querySelector('#walk-viewer-title')!.textContent=button.dataset.screenTitle!;dialog!.querySelector('[data-screen-caption]')!.textContent=button.dataset.screenCaption!;dialog!.querySelector('[data-screen-counter]')!.textContent=`${current+1} / ${screens.length}`;dialog!.classList.remove('walk-viewer-actual');size.setAttribute('aria-pressed','false');size.textContent='Actual size';dialog!.querySelector('.walk-viewer-image')!.scrollTo(0,0);}
 screens.forEach((button,index)=>button.addEventListener('click',()=>{opener=button;show(index);oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';dialog.showModal();}));
 dialog.querySelector('[data-screen-close]')!.addEventListener('click',()=>dialog.close());
 dialog.querySelector('[data-screen-prev]')!.addEventListener('click',()=>show(current-1));
 dialog.querySelector('[data-screen-next]')!.addEventListener('click',()=>show(current+1));
 size.addEventListener('click',()=>{const actual=dialog.classList.toggle('walk-viewer-actual');size.setAttribute('aria-pressed',String(actual));size.textContent=actual?'Fit screen':'Actual size';});
 dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(current+(event.key==='ArrowLeft'?-1:1));}});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{document.body.style.overflow=oldOverflow;opener?.focus({preventScroll:true});});
}

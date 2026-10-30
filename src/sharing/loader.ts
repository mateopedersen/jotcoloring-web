/** Sharing code and dialog CSS are fetched only after an intentional Share action. */
export function mountShareLoader(){
 let pending:Promise<typeof import('./controller')>|undefined,latest:{id:string;button:HTMLElement}|undefined;
 const load=(event:MouseEvent)=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||!(event.target instanceof Element))return;
  const button=event.target.closest<HTMLElement>('[data-share-coloring]');if(!button)return;
  event.preventDefault();latest?.button.removeAttribute('aria-busy');latest={id:button.dataset.shareColoring!,button};button.setAttribute('aria-busy','true');
  if(pending)return;
  pending=import('./controller');
  void pending.then(module=>{document.removeEventListener('click',load);const wanted=latest;latest=undefined;wanted?.button.removeAttribute('aria-busy');if(wanted)void module.openColoringShare(wanted.id,wanted.button);}).catch(()=>{
   pending=undefined;latest?.button.removeAttribute('aria-busy');latest?.button.setAttribute('title','Sharing could not load. Please try again.');latest=undefined;
  });
 };
 document.addEventListener('click',load);
}

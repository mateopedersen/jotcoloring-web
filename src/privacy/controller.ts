import './notice.css';
/** Information is available on request; the static sponsor link is not permission-gated. */
export function mountStorageNotice(){
 const dialog=document.querySelector<HTMLDialogElement>('[data-storage-dialog]');if(!dialog)return;
 let opener:HTMLElement|undefined;
 document.addEventListener('click',event=>{const target=(event.target as Element).closest<HTMLElement>('[data-storage-settings],[data-storage-close]');if(!target)return;event.preventDefault();if(target.hasAttribute('data-storage-close')){dialog.close();return;}opener=target;if(!dialog.open)dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-storage-close]')?.focus({preventScroll:true});});
 dialog.addEventListener('close',()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});
}

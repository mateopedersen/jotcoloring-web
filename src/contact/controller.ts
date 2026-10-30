import {CONTACT_DRAFT_KEY,contactFormURL} from './config';
export function mountContact(){
 const root=document.querySelector<HTMLElement>('[data-contact]');if(!root)return;
 const frame=root.querySelector<HTMLIFrameElement>('[data-contact-frame]')!,intro=root.querySelector<HTMLElement>('[data-contact-intro]')!,external=root.querySelector<HTMLAnchorElement>('[data-contact-external]')!,status=root.querySelector<HTMLElement>('[data-contact-status]')!;
 let active=new URL(location.href).searchParams.get('topic')||'feedback',loaded=false,draft='';
 try{draft=sessionStorage.getItem(CONTACT_DRAFT_KEY)||'';}catch{}
 const update=(id:string)=>{active=id;root.querySelectorAll<HTMLButtonElement>('[data-contact-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.contactTopic===id)));};
 const load=()=>{const target=contactFormURL(active,draft);frame.src=target;external.href=target.replace('embedded=true','embedded=false');frame.hidden=false;intro.hidden=true;loaded=true;status.textContent='Complete the form below. Google will confirm when your message is received.';};
 update(active);
 root.querySelectorAll<HTMLButtonElement>('[data-contact-topic]').forEach(b=>b.addEventListener('click',()=>{if(loaded){status.textContent='Your open form has been kept unchanged. Choose the topic inside the form to avoid losing your message.';return;}update(b.dataset.contactTopic!);}));
 root.querySelector('[data-contact-start]')?.addEventListener('click',load);
}

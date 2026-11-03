/** Same-page browsing: bounded signed batches, shared server-rendered cards. */
export function mountCatalogStream(){
 const sentinel=document.querySelector<HTMLElement>('[data-catalog-stream]'),grid=document.querySelector<HTMLElement>('.jc-catalog-grid');
 if(!sentinel||!grid)return;
 const button=sentinel.querySelector<HTMLButtonElement>('button')!,status=sentinel.querySelector<HTMLElement>('[role=status]')!;
 let cursor=sentinel.dataset.nextCursor||'',busy=false,done=!cursor,stopped=false;
 let controller:AbortController|undefined,leaving=false;
 const source=sentinel.dataset.source!;
 const seen=new Set([...grid.querySelectorAll<HTMLElement>('[data-content-id]')].map(e=>e.dataset.contentId));
 const load=async()=>{
  if(busy||done||stopped)return;busy=true;button.disabled=true;status.textContent='Loading more coloring pages…';sentinel.setAttribute('aria-busy','true');
  controller=new AbortController();const active=controller;const timer=setTimeout(()=>active.abort(),20000);
  try{
   const next=new URL('/catalog-fragment/',location.origin);next.search=new URLSearchParams(location.search).toString();next.searchParams.delete('page');next.searchParams.set('source',source);next.searchParams.set('cursor',cursor);
   const response=await fetch(next,{signal:controller.signal});if(!response.ok||!response.headers.get('Content-Type')?.includes('text/html'))throw Error();
   const parsed=new DOMParser().parseFromString(await response.text(),'text/html'),fragment=parsed.querySelector<HTMLElement>('[data-catalog-fragment]');if(!fragment)throw Error();
   const fresh=fragment.dataset.nextCursor||'',cards=[...fragment.querySelectorAll<HTMLElement>('.art-card[data-content-id]')];
   if(fragment.dataset.hasMore==='true'&&(!fresh||fresh===cursor)||!cards.length&&fragment.dataset.hasMore==='true')throw Error();
   for(const card of cards){if(seen.has(card.dataset.contentId))continue;seen.add(card.dataset.contentId);card.querySelectorAll('script').forEach(s=>s.remove());grid.append(document.importNode(card,true));}
   cursor=fresh;done=fragment.dataset.hasMore!=='true';status.textContent=done?`All ${seen.size.toLocaleString('en-US')} coloring pages are shown.`:`${seen.size.toLocaleString('en-US')} coloring pages shown. Keep scrolling to see more.`;button.hidden=done;
   document.dispatchEvent(new CustomEvent('jot:catalog-appended'));
  }catch(error){if(!leaving){stopped=true;status.textContent='More pages could not load. Your current pages are still here.';button.textContent='Try Again';button.hidden=false;}}
  finally{clearTimeout(timer);busy=false;button.disabled=false;sentinel.setAttribute('aria-busy','false');}
 };
 button.addEventListener('click',()=>{stopped=false;void load();});
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))void load();},{rootMargin:'500px 0px'});observer.observe(sentinel);window.addEventListener('pagehide',()=>{leaving=true;observer.disconnect();controller?.abort();});window.addEventListener('pageshow',event=>{if(event.persisted){leaving=false;stopped=false;if(!done)observer.observe(sentinel);}});}
}

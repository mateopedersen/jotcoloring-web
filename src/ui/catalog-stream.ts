/** Same-page browsing: bounded signed batches, shared server-rendered cards. */
export function mountCatalogStream(){
 const sentinel=document.querySelector<HTMLElement>('[data-catalog-stream]'),grid=document.querySelector<HTMLElement>('.jc-catalog-grid');
 if(!sentinel||!grid)return;
 const button=sentinel.querySelector<HTMLButtonElement>('button')!,status=sentinel.querySelector<HTMLElement>('[role=status]')!;
 let cursor=sentinel.dataset.nextCursor||'',busy=false,done=!cursor,stopped=false,failures=0;
 let controller:AbortController|undefined,leaving=false,timer:ReturnType<typeof setTimeout>|undefined;
 const source=sentinel.dataset.source!;
 const seen=new Set([...grid.querySelectorAll<HTMLElement>('[data-content-id]')].map(e=>e.dataset.contentId));
 // A partly filled row is normal. Fetch the next batch as the reader approaches it.
 const needed=()=>{
  if(leaving||done||stopped||document.visibilityState==='hidden')return false;
  // Keep additional HTML/images off the initial connection. Once the reader
  // scrolls, the existing look-ahead continues the complete collection.
  if(scrollY<8&&grid.getBoundingClientRect().bottom>innerHeight+200)return false;
  return sentinel.getBoundingClientRect().top<innerHeight+Math.max(1000,innerHeight*1.5);
 };
 const schedule=()=>{if(!timer&&needed())timer=setTimeout(()=>{timer=undefined;void load();},80);};
 const load=async()=>{
  if(busy||done||stopped||leaving)return;busy=true;button.hidden=true;button.disabled=true;status.textContent='Loading coloring pages…';sentinel.setAttribute('aria-busy','true');
  controller=new AbortController();const active=controller,deadline=setTimeout(()=>active.abort(),20000);
  try{
   const next=new URL('/catalog-fragment/',location.origin);next.search=new URLSearchParams(location.search).toString();next.searchParams.delete('page');next.searchParams.set('source',source);next.searchParams.set('cursor',cursor);
   const response=await fetch(next,{signal:controller.signal});if(!response.ok||!response.headers.get('Content-Type')?.includes('text/html'))throw Error();
   const parsed=new DOMParser().parseFromString(await response.text(),'text/html'),fragment=parsed.querySelector<HTMLElement>('[data-catalog-fragment]');if(!fragment)throw Error();
   const fresh=fragment.dataset.nextCursor||'',cards=[...fragment.querySelectorAll<HTMLElement>('.art-card[data-content-id]')];
   const more=fragment.dataset.hasMore==='true',newCards=cards.filter(card=>!seen.has(card.dataset.contentId));
   if(more&&(!fresh||fresh===cursor||!newCards.length))throw Error();
   for(const card of newCards){seen.add(card.dataset.contentId);card.querySelectorAll('script').forEach(s=>s.remove());grid.append(document.importNode(card,true));}
   cursor=fresh;done=!more;failures=0;status.textContent=done?`All ${seen.size.toLocaleString('en-US')} coloring pages are shown.`:'';
   document.dispatchEvent(new CustomEvent('jot:catalog-appended'));
  }catch{if(!leaving){failures++;if(failures<=2){status.textContent='Reconnecting to load the remaining pages…';timer=setTimeout(()=>{timer=undefined;void load();},failures*1500);}else{stopped=true;status.textContent='The remaining pages could not load. Your current pages are still here.';button.textContent='Retry Loading';button.hidden=false;}}}
  finally{clearTimeout(deadline);busy=false;button.disabled=false;sentinel.setAttribute('aria-busy','false');schedule();}
 };
 button.addEventListener('click',()=>{stopped=false;failures=0;void load();});
 const observer='IntersectionObserver' in window?new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))schedule();},{rootMargin:'1500px 0px'}):undefined;
 observer?.observe(sentinel);
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);
 window.addEventListener('pagehide',()=>{leaving=true;clearTimeout(timer);timer=undefined;observer?.disconnect();controller?.abort();});
 window.addEventListener('pageshow',event=>{if(event.persisted){leaving=false;stopped=false;failures=0;if(!done)observer?.observe(sentinel);schedule();}});
 schedule();
}

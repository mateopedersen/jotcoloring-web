import './image-info.css';
/** Hover descriptions are supplemental. Touch, scrolling and slider gestures
 * must keep the picture and its controls unobstructed. Keyboard image links
 * retain the same explanation, dismissible with Escape. */
export function mountImageInfo(){
 if(document.getElementById('jc-image-information'))return;
 const tip=document.createElement('div');tip.className='jc-image-info';tip.id='jc-image-information';tip.role='tooltip';tip.hidden=true;
 const title=document.createElement('strong'),copy=document.createElement('p');tip.append(title,copy);document.body.append(tip);
 let active:HTMLElement|undefined,dismissed:HTMLElement|undefined,timer:ReturnType<typeof setTimeout>|undefined,input:'mouse'|'touch'|'keyboard'='mouse';
 const parent=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLElement>('[data-image-title]'):null;
 function hide(){clearTimeout(timer);tip.hidden=true;active=undefined;}
 function position(){if(!active||tip.hidden)return;const box=active.getBoundingClientRect(),width=tip.getBoundingClientRect().width;
  const left=Math.max(12,Math.min(innerWidth-width-12,box.left+box.width/2-width/2));let top=box.bottom-18;
  if(top+tip.offsetHeight>innerHeight-12)top=box.top-tip.offsetHeight+18;
  top=Math.max(12,Math.min(innerHeight-tip.offsetHeight-12,top));tip.style.left=`${left}px`;tip.style.top=`${top}px`;
 }
 function show(target:HTMLElement){if(target===dismissed)return;clearTimeout(timer);active=target;title.textContent=target.dataset.imageTitle||'';copy.textContent=target.dataset.imageDescription||'';tip.hidden=false;position();}
 document.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse'||e.buttons)return;input='mouse';const target=parent(e.target);if(target)show(target);});
 document.addEventListener('pointerdown',e=>{input=e.pointerType==='mouse'?'mouse':'touch';dismissed=parent(e.target)||undefined;hide();},{passive:true});
 document.addEventListener('pointerout',e=>{if(e.pointerType!=='mouse')return;const target=parent(e.target),next=e.relatedTarget;
  if(!target||next instanceof Node&&target.contains(next))return;if(next instanceof Node&&tip.contains(next))return;dismissed=undefined;timer=setTimeout(hide,140);
 });
 tip.addEventListener('pointerenter',()=>clearTimeout(timer));tip.addEventListener('pointerleave',()=>{dismissed=undefined;hide();});
 document.addEventListener('focusin',e=>{const target=parent(e.target),control=e.target instanceof Element&&e.target.closest('input,select,textarea,button');
  if(input==='keyboard'&&target&&!control)show(target);else if(!(e.target instanceof Node&&tip.contains(e.target)))hide();
 });
 document.addEventListener('focusout',e=>{const target=parent(e.target);if(target&&!(e.relatedTarget instanceof Node&&target.contains(e.relatedTarget))){dismissed=undefined;hide();}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){dismissed=active;hide();}else if(e.key==='Tab'||e.key.startsWith('Arrow')){input='keyboard';dismissed=undefined;}});
 const scrolling=()=>{if(active)dismissed=active;hide();};window.addEventListener('scroll',scrolling,{passive:true,capture:true});window.addEventListener('resize',scrolling);
}

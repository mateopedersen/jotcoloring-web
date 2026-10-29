/** Two useful tool cards complete the final row at every gallery width. */
export function galleryPromoSpans(items:number,columns:number):[number,number]{
 if(!Number.isInteger(items)||items<0||!Number.isInteger(columns)||columns<1||columns>12)throw new Error('Invalid gallery size.');
 if(columns===1)return[1,1];
 const free=(columns-items%columns)%columns;
 if(free===1)return[1,columns];
 const spaces=free||columns;
 return[Math.floor(spaces/2),Math.ceil(spaces/2)];
}
export function mountGalleryPromos(){
 for(const grid of document.querySelectorAll<HTMLElement>('[data-home-gallery-grid]')){
  const cards=Array.from(grid.querySelectorAll<HTMLElement>('[data-gallery-promo]'));
  if(cards.length!==2)continue;
  const count=grid.querySelectorAll('.hc-card').length;let previous=0;
  const update=()=>{const columns=getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;if(columns===previous||columns<1||columns>12)return;previous=columns;const spans=galleryPromoSpans(count,columns);cards.forEach((card,i)=>{card.style.gridColumn=`span ${spans[i]}`;});};
  update();const observer=new ResizeObserver(update);observer.observe(grid);window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
 }
}

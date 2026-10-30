/** Read-only browser probe. Run with page.evaluate(measureLayout) at each target
 * viewport after fonts/images settle. Repeat with menus and dialogs open.
 * Intentional horizontal scrollers, screen-reader labels and truncated titles
 * are not page-overflow failures. A clean probe still needs visual inspection.
 */
export function measureLayout() {
  const visible = e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' &&
      s.display !== 'none' && !e.closest('[hidden],.sr-only,dialog:not([open])');
  };
  const contained = e => {
    for (let p = e.parentElement; p && p !== document.body; p = p.parentElement)
      if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX)) return true;
    return false;
  };
  const identify = e => ({ tag: e.tagName, className: typeof e.className === 'string' ? e.className : 'svg' });
  const elements = [...document.querySelectorAll('main *,header *,footer *,dialog[open] *')].filter(visible);
  const overflow = elements.filter(e => {
    const r = e.getBoundingClientRect();
    return (r.left < -2 || r.right > innerWidth + 2) && !contained(e);
  }).map(identify);
  const clippedText = elements.filter(e => {
    if (!e.matches('h1,h2,h3,p,strong,small,button,summary,figcaption')) return false;
    const s = getComputedStyle(e);
    return e.scrollWidth > e.clientWidth + 3 && e.clientWidth > 0 &&
      s.textOverflow !== 'ellipsis' && s.webkitLineClamp === 'none' && s.whiteSpace !== 'nowrap';
  }).map(identify);
  const arrows = elements.filter(e => e.matches('svg.jc-direction-icon')).filter(e => {
    const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect();
    return r.left < p.left - 2 || r.right > p.right + 2 || r.top < p.top - 2 || r.bottom > p.bottom + 2;
  }).map(identify);
  const narrowText = elements.filter(e => e.matches('p,strong,small,span') && !e.children.length &&
    e.textContent.trim().length > 25 && e.getBoundingClientRect().width < 80 &&
    e.getBoundingClientRect().height > 45).map(identify);
  const rows = new Map();
  for (const e of document.querySelectorAll('.hc-card,.iv-card')) {
    if (!visible(e)) continue;
    const card = e.getBoundingClientRect(), actions = e.querySelector('.jc-file-actions')?.getBoundingClientRect();
    if (!actions) continue;
    const key = Math.round(card.top), row = rows.get(key) || [];
    row.push(Math.round(actions.bottom)); rows.set(key, row);
  }
  const misalignedRows = [...rows.values()].filter(row => row.length > 1 && Math.max(...row) - Math.min(...row) > 3);
  const missingAlt = [...document.images].filter(e => !e.hasAttribute('alt')).length;
  const brokenImages = [...document.images].filter(e => e.complete && !e.naturalWidth && e.currentSrc).length;
  const pageOverflow = document.documentElement.scrollWidth > innerWidth + 2;
  return { viewport: innerWidth, pageOverflow, overflow, clippedText, arrows, narrowText,
    misalignedRows, missingAlt, brokenImages,
    pass: !pageOverflow && !overflow.length && !clippedText.length && !arrows.length &&
      !narrowText.length && !misalignedRows.length && !missingAlt && !brokenImages };
}

/** Check visible control labels and alignment inside actual action groups.
 * Masonry galleries and explicitly designated image carousels may scroll.
 */
export function measureControls() {
  const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],.sr-only,dialog:not([open])');};
  const identify=e=>({tag:e.tagName,className:typeof e.className==='string'?e.className:'svg',text:e.textContent.trim().replace(/\s+/g,' ').slice(0,85)});
  const labels=[...document.querySelectorAll('.jc-footer-link-label,.support-tabs>a>b,.jc-file-copy,.aw-preview-actions button>span:last-child,.aw-dialog-secondary button>span:last-child,.jc-photo-formats strong,.jc-photo-formats small,.jc-dl-format>span,.jc-age-links>a>span,.settings-tabs button,.cf-cta>span:first-child,.jc-category-label>span,.aw-new-board-copy')].filter(visible);
  const escapingLabels=[];
  for(const label of labels){const control=label.closest('a,button,label');if(!control||!visible(control))continue;const range=document.createRange();range.selectNodeContents(label);const r=range.getBoundingClientRect(),p=control.getBoundingClientRect();if(r.width&&r.height&&(r.left<p.left-2||r.right>p.right+2||r.top<p.top-2||r.bottom>p.bottom+2))escapingLabels.push(identify(label));}
  const selectors='.support-tabs,.support-actions,.support-link-grid,.support-link-cards,.support-contact-rail,.jc-file-actions .format-links,.jc-gallery-tabs,.jc-footer-nav-links,.aw-controls,.aw-preview-actions,.aw-dialog-secondary,.settings-tabs,.difficulty-levels,.starter-pagination,.aw-toolbar,.aw-hero-actions,.studio-format-grid,.jc-photo-formats,.jc-dl-formats,.iv-filter-bar,.jc-age-links';
  const overlaps=[],unevenRows=[],underfilledGroups=[],groups=[];
  for(const parent of document.querySelectorAll(selectors)){
    if(!visible(parent))continue;const children=[...parent.children].filter(e=>visible(e)&&!['absolute','fixed'].includes(getComputedStyle(e).position));if(children.length<2)continue;
    const style=getComputedStyle(parent),boxes=children.map(e=>({e,r:(e.matches('label')&&parent.matches('.studio-format-grid,.jc-photo-formats')?e.querySelector(':scope>span')||e:e).getBoundingClientRect()}));
    groups.push({className:parent.className,gap:style.gap,children:children.length});
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.r.right,b.r.right)-Math.max(a.r.left,b.r.left)>2&&Math.min(a.r.bottom,b.r.bottom)-Math.max(a.r.top,b.r.top)>2)overlaps.push({group:parent.className,a:identify(a.e),b:identify(b.e)});}
    if(style.display!=='grid'||/auto|scroll/.test(style.overflowX))continue;
    const rows=[];for(const box of boxes){let row=rows.find(row=>Math.abs(row[0].r.top-box.r.top)<3);if(!row){row=[];rows.push(row)}row.push(box);}
    for(const row of rows)if(row.length>1&&Math.max(...row.map(x=>x.r.height))-Math.min(...row.map(x=>x.r.height))>3)unevenRows.push({group:parent.className,heights:row.map(x=>Math.round(x.r.height))});
  }
  for(const group of document.querySelectorAll('.jc-footer-nav-links')){if(!visible(group))continue;const parent=group.parentElement,s=getComputedStyle(parent),available=parent.clientWidth-(+s.paddingLeft.replace('px',''))-(+s.paddingRight.replace('px',''));if(available-group.getBoundingClientRect().width>3)underfilledGroups.push({group:group.className,available:Math.round(available),width:Math.round(group.getBoundingClientRect().width)});}
  // Overlay controls must not occupy the same corner on new cards or new categories.
  for(const picture of document.querySelectorAll('.hc-picture,.iv-card-picture')){
    const controls=[...picture.querySelectorAll('.jc-category-label--overlay,.jc-detail-badge-overlay,.jc-share-trigger--card')].filter(visible);
    for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){
      const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();
      if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)overlaps.push({group:picture.className,a:identify(controls[i]),b:identify(controls[j])});
    }
  }
  // An empty library uses the whole row, rather than reserving blank board columns.
  for(const grid of document.querySelectorAll('.aw-boards-grid')){
    const children=[...grid.children].filter(visible);
    if(children.length===1&&children[0].matches('.aw-new-board')&&grid.clientWidth-children[0].getBoundingClientRect().width>4)underfilledGroups.push({group:grid.className,available:grid.clientWidth,width:Math.round(children[0].getBoundingClientRect().width)});
  }
  return{viewport:innerWidth,escapingLabels,overlaps,unevenRows,underfilledGroups,groups,pass:!escapingLabels.length&&!overlaps.length&&!unevenRows.length&&!underfilledGroups.length};
}

/** A page can fit the viewport while its buttons still clip their contents.
 * Inspect the actual text/icon boxes and navigation groups, including dialogs.
 * Deliberate image carousels, native input text scrolling and invisible tooltips
 * are excluded; navigation and action controls must fit without sideways scroll.
 */
export function measureMobileControls() {
  const visible=e=>{
    const r=e.getBoundingClientRect(),s=getComputedStyle(e);
    if(!r.width||!r.height||s.display==='none'||s.visibility==='hidden'||Number(s.opacity)===0||
      e.closest('[hidden],.sr-only,dialog:not([open])'))return false;
    for(let p=e.parentElement;p;p=p.parentElement){
      if(Number(getComputedStyle(p).opacity)===0)return false;
      if(p.matches('details:not([open])')&&!p.querySelector(':scope>summary')?.contains(e))return false;
    }
    return true;
  };
  const identify=e=>({tag:e.tagName,className:typeof e.className==='string'?e.className:'svg',text:(e.getAttribute('aria-label')||e.textContent).trim().replace(/\s+/g,' ').slice(0,100)});
  const clippedControls=[],escapedIcons=[],scrollingGroups=[];
  for(const control of document.querySelectorAll('button,a,summary')){
    if(!visible(control)||control.closest('.support-prose p,.support-prose li,.support-faq-answer'))continue;
    const box=control.getBoundingClientRect(),style=getComputedStyle(control);
    // Inline prose links naturally fragment over lines; card and button labels do not.
    if(style.display==='inline')continue;
    let clipped=control.scrollWidth>control.clientWidth+3;
    for(const label of [control,...control.querySelectorAll('span,b,strong,small')]){
      if(!visible(label)||!label.textContent.trim()||[...label.children].some(e=>e.tagName.toLowerCase()!=='svg'))continue;
      const textStyle=getComputedStyle(label);
      if(textStyle.textOverflow==='ellipsis'||textStyle.webkitLineClamp!=='none')continue;
      const range=document.createRange();range.selectNodeContents(label);
      const r=range.getBoundingClientRect();
      if(r.width&&r.height&&(r.left<box.left-3||r.right>box.right+3||r.top<box.top-3||r.bottom>box.bottom+3))clipped=true;
    }
    if(clipped)clippedControls.push(identify(control));
    for(const icon of control.querySelectorAll('svg')){
      if(!visible(icon))continue;
      const r=icon.getBoundingClientRect();
      if(r.left<box.left-3||r.right>box.right+3||r.top<box.top-3||r.bottom>box.bottom+3)
        escapedIcons.push({...identify(control),icon:icon.getAttribute('data-vector-icon')||icon.getAttribute('class')});
    }
  }
  const groups='.support-tabs,.support-actions,.jc-gallery-tabs,.gallery-explore-themes,.jc-discovery-ideas>div,.library-filters,.library-scopes,.library-search-row,.library-pagination,.library-preview-levels,.library-preview-actions,.settings-tabs,.studio-tools,.canvas-toolbar,.plus-grid,.two-buttons,.two-fields,.studio-format-grid,.object-search,.jc-photo-formats,.jc-photo-presets,.jc-dl-formats,.jc-share-caption-actions,.jc-share-groups,.aw-toolbar,.aw-controls,.aw-preview-actions,.aw-dialog-secondary';
  for(const group of document.querySelectorAll(groups))if(visible(group)&&group.scrollWidth>group.clientWidth+3)
    scrollingGroups.push({...identify(group),width:group.clientWidth,contentWidth:group.scrollWidth});
  return {viewport:innerWidth,clippedControls,escapedIcons,scrollingGroups,
    pass:!clippedControls.length&&!escapedIcons.length&&!scrollingGroups.length};
}

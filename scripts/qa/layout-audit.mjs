/** Read-only browser probe. Run with page.evaluate(measureLayout) at each target
 * viewport after fonts/images settle. Repeat with menus and dialogs open.
 * Intentional horizontal scrollers, screen-reader labels and truncated titles
 * are not page-overflow failures. A clean probe still needs visual inspection.
 */
export function measureLayout() {
  const visible = e => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' &&
      s.display !== 'none' && !e.closest('[hidden],.sr-only,[aria-hidden=true],dialog:not([open])');
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

/** Preserve subject punctuation; normalize only the trailing site-brand separator. */
export function searchTitle(value:string,path='/'){
 const title=value.replace(/\s+(?:—|–|-|·)\s+(?=JotColoring\s*$)/,' | ').trim();
 if(/^free\b/i.test(title))return title;
 // Do not imply that a commercial license, legal document, or support is free.
 return /^\/(?:collections?|coloring|coloring-pages|coloring-by-age|studio|drawing-board|create)(?:\/|$)/.test(path)?`Free ${title}`:`Free Coloring Pages | ${title}`;
}

/** Keep title punctuation and the free coloring offer consistent on new pages. */
export function searchTitle(value:string,path='/'){
 const title=value.replace(/\s+(?:—|–|-|·)\s+/g,' | ').trim();
 if(/^free\b/i.test(title))return title;
 // Do not imply that a commercial license, legal document, or support is free.
 return /^\/(?:coloring|coloring-pages|coloring-by-age|studio|drawing-board|create)(?:\/|$)/.test(path)?`Free ${title}`:`Free Coloring Pages | ${title}`;
}

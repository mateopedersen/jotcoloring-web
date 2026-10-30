/** Normalize decorative title separators without changing hyphenated words or ages. */
export function searchTitle(value:string){return value.replace(/\s+(?:—|–|-|·)\s+/g,' | ').trim();}

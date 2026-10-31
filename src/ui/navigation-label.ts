/** Owner's display style for short navigation/action labels, including small
 * connecting words. Does not change prose, URLs, artwork metadata or acronyms. */
export function navigationLabel(label:string){return label.replace(/(^|[\s/&–-])([a-z])/g,(_,prefix:string,letter:string)=>prefix+letter.toUpperCase());}

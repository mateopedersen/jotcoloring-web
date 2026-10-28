/** Display collection names with readable word initials, preserving mixed-case brands/acronyms. */
export function displayTitle(value:string){return value.split(/([\s-]+)/u).map(word=>word===word.toLocaleLowerCase('en-US')?word.replace(/^\p{L}/u,letter=>letter.toLocaleUpperCase('en-US')):word).join('');}

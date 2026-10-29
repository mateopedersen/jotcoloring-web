/** Shared lexical intent. No network, paid model or inferred facts about unseen images. */
export const SEARCH_VERSION='jot-search-2';
const groups=[['cat','cats','kitten','kittens','kitty','kitties'],['dog','dogs','puppy','puppies','pup'],['rabbit','rabbits','bunny','bunnies'],['fox','foxes'],['deer','fawn','fawns'],['bird','birds'],['owl','owls'],['hedgehog','hedgehogs'],['flower','flowers','floral','bloom','blooms'],['dinosaur','dinosaurs','dino','dinos'],['car','cars','automobile','automobiles'],['camper','campers','campervan','van','vans'],['ocean','underwater','marine'],['turtle','turtles'],['fish','fishes'],['space','outerspace'],['astronaut','astronauts'],['planet','planets'],['mandala','mandalas'],['butterfly','butterflies'],['cupcake','cupcakes'],['dessert','desserts','sweets'],['snowman','snowmen'],['christmas','xmas'],['woodland','forest'],['bookshop','bookstore'],['color','colour']];
const aliases=new Map(groups.flatMap(group=>group.map(term=>[term,group] as const)));
const filler=new Set(['a','an','the','of','and','for','with','to','please','find','show','me','some','free','printable','printables','coloring','colouring','page','pages','sheet','sheets','picture','pictures','cute']);
export function searchWords(value:string,limit=12){return value.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/(?:coloring|colouring)[ -]+(?:pages?|sheets?)/g,' ').match(/[\p{L}\p{N}]+/gu)?.slice(0,limit)||[];}
export function intentWords(value:string){return searchWords(value).filter(w=>!filler.has(w)).slice(0,8);}
export function parseSearchIntent(value:string){let remaining=value.toLowerCase();const ages:string[]=[],bands:string[]=[],difficulty:string[]=[];
 remaining=remaining.replace(/\bfor\s+(adults?|kids|children|teens?|teenagers)\b/g,(_,group:string)=>{ages.push(/adult/.test(group)?'adults':/teen/.test(group)?'teens':'kids');return' ';});
 remaining=remaining.replace(/^(adults?|kids|children|teens?|teenagers)(?=\s+colou?ring|\s*$)/,(_,group:string)=>{ages.push(/adult/.test(group)?'adults':/teen/.test(group)?'teens':'kids');return' ';});
 const byAge=(first:number,last=first)=>{for(const [id,min,max] of [['3-5',3,5],['6-8',6,8],['9-12',9,12],['13-17',13,17],['adults',18,120]] as const)if(first<=max&&last>=min)bands.push(id);};
 remaining=remaining.replace(/\bages?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\b/g,(_,a:string,b:string)=>{byAge(Number(a),Number(b||a));return' ';}).replace(/\b(\d{1,2})[ -]+year[ -]+olds?\b/g,(_,a:string)=>{byAge(Number(a));return' ';});
 remaining=remaining.replace(/\b(easy|simple|detailed|intricate)\b/g,(_,level:string)=>{difficulty.push(['easy','simple'].includes(level)?'easy':'detailed');return' ';});
 return{words:intentWords(remaining),ages:[...new Set(ages)],bands:[...new Set(bands)],difficulty:[...new Set(difficulty)]};
}
export function equivalents(word:string){return aliases.get(word)||[word];}
export function canonicalSubject(word:string){return equivalents(word)[0];}
const quote=(word:string)=>'"'+word.replaceAll('"','""')+'"';
export function intentExpression(words:string[],known:ReadonlySet<string>=new Set()){
 return words.map((word,index)=>{const forms=equivalents(word),prefix=forms.length===1&&!known.has(word)&&index===words.length-1&&word.length>=2&&!/^\d+$/.test(word);return forms.length>1?'('+forms.map(quote).join(' OR ')+')':quote(word)+(prefix?'*':'');}).join(' AND ');
}
/** Bounded Damerau distance; transposed letters count as one edit. */
export function spellingDistance(a:string,b:string,max=2){if(Math.abs(a.length-b.length)>max)return max+1;const rows=[Array.from({length:b.length+1},(_,i)=>i)];for(let i=1;i<=a.length;i++){const row=[i];for(let j=1;j<=b.length;j++){let d=Math.min(row[j-1]+1,rows[i-1][j]+1,rows[i-1][j-1]+Number(a[i-1]!==b[j-1]));if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])d=Math.min(d,rows[i-2][j-2]+1);row.push(d);}rows.push(row);}return rows[a.length][b.length];}
export function correctionFor(word:string,vocabulary:Array<{term:string;doc:number}>){if(word.length<4||/^\d+$/.test(word))return;const max=word.length>=8?2:1,seen=new Map<string,number>();for(const row of vocabulary)if(row.term.length>=3&&Math.abs(row.term.length-word.length)<=max)seen.set(row.term,Math.max(seen.get(row.term)||0,row.doc));const ranked=[...seen].map(([term,doc])=>({term,doc,distance:spellingDistance(word,term,max)})).filter(r=>r.distance>0&&r.distance<=max).sort((a,b)=>a.distance-b.distance||b.doc-a.doc||a.term.localeCompare(b.term));if(!ranked.length)return;const first=ranked[0],second=ranked[1];if(second&&first.distance===second.distance&&first.doc<second.doc*3)return;return first.term;}
export const commonSearchTerms=[...aliases.keys()];
export interface SearchMatch {mode:'direct'|'related-words'|'corrected'|'none';query:string;interpreted:string;}

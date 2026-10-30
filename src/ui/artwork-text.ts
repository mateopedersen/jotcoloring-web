import type {Content} from '../server/types';
import homeCaptions from '../content/home-captions.json';
/** One source for image names, descriptions and text alternatives, including future imports. */
export function artworkText(item:Pick<Content,'title'|'description'|'alt'>){const title=item.title.trim();const description=item.description?.trim()||item.alt?.trim()||title;const alt=item.alt?.trim()||description;return{title,description,alt};}

/** Compact captions condense accepted catalog copy. A replaced image or renamed
 * subject invalidates its saved caption. Future items use existing metadata;
 * this helper never invents image observations or cuts a sentence mid-word.
 */
export function artworkSummary(item:Pick<Content,'id'|'title'|'description'|'alt'|'lineArtUrl'>){
 const saved=(homeCaptions as Record<string,{sourceHash:string;title:string;summary:string}>)[item.id];
 if(saved&&saved.title===item.title&&item.lineArtUrl?.includes(saved.sourceHash))return saved.summary;
 const text=artworkText(item);
 for(const source of [text.description,text.alt]){
  const first=source.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||source.trim();
  const clause=first.split(/[,;]|\s[—–]\s/)[0].trim();
  for(const candidate of [first,clause])if(candidate.length<=48&&candidate.split(/\s+/).length<=10)return /[.!?]$/.test(candidate)?candidate:candidate+'.';
 }
 return /[.!?]$/.test(text.title)?text.title:text.title+'.';
}

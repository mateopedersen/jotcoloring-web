import {illustrationMarkup,glyphMarkup,hasIllustration} from '../icons/registry';
export function libraryIcon(name:string){
 if(hasIllustration(name)&&!['check'].includes(name))return illustrationMarkup(name,'aw-illustrated-icon',`data-artwork-icon="${name}"`);
 return glyphMarkup(name);
}
export function boardArt(name:string){return illustrationMarkup(name,'aw-board-art');}

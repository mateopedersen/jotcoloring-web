import {illustrationMarkup} from '../icons/registry';
const tools=new Set(['brush','fill','eraser','picker','move','zoom']);
export function toolIcon(name:string){return illustrationMarkup(tools.has(name)?name:'brush','jc-studio-tool-icon');}

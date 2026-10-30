import catalog from './brand-catalog.json';
import type {SharePlatform} from './platforms';

/** Preserve approved platform geometry while sharing one cacheable SVG resource. */
export function socialMark(platform:SharePlatform){
 const mark=document.createElement('span');mark.className='jc-social-mark';mark.setAttribute('aria-hidden','true');
 mark.style.setProperty('--social-color',platform.color);
 mark.style.setProperty('--social-ink',['snapchat','qzone','kakaotalk','kakaostory','minds','lemon8'].includes(platform.id)?'#242328':'#fff');
 if(platform.icon&&catalog.ids.includes(platform.icon)){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS(svg.namespaceURI,'use');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','26');svg.setAttribute('height','26');svg.setAttribute('fill','currentColor');svg.setAttribute('focusable','false');
  use.setAttribute('href',`${catalog.url}#${platform.icon}`);svg.append(use);mark.append(svg);
 }else{const initials=document.createElement('b');initials.textContent=platform.initials||platform.name.slice(0,2);mark.append(initials);}
 return mark;
}

/** Read-only text contrast probe for solid and gradient-stop backgrounds. Image
 * backgrounds need visual inspection or Lighthouse; this is a supplemental check. */
export function measureContrast(){
 const rgba=value=>{const m=value.match(/[\d.]+/g);return m?{r:+m[0],g:+m[1],b:+m[2],a:m[3]===undefined?1:+m[3]}:{r:0,g:0,b:0,a:0}};
 const over=(a,b)=>{const alpha=a.a+b.a*(1-a.a);return alpha?{r:(a.r*a.a+b.r*b.a*(1-a.a))/alpha,g:(a.g*a.a+b.g*b.a*(1-a.a))/alpha,b:(a.b*a.a+b.b*b.a*(1-a.a))/alpha,a:alpha}:b};
 const luminance=c=>{const channels=[c.r,c.g,c.b].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]};
 const failures=[];let checked=0,complexBackgrounds=0;
 for(const e of document.querySelectorAll('body *')){
  if(e.namespaceURI!=='http://www.w3.org/1999/xhtml'||e.closest('script,style,svg,dialog:not([open]),[hidden],[aria-hidden=true],[aria-disabled=true],.sr-only,button:disabled,input:disabled,select:disabled'))continue;
  const text=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ').trim();if(!text||!/\p{L}|\p{N}/u.test(text))continue;
  const rect=e.getBoundingClientRect(),s=getComputedStyle(e);if(!rect.width||!rect.height||s.visibility==='hidden'||s.display==='none')continue;
  const chain=[];let complex=false,hidden=false;
  for(let p=e;p;p=p.parentElement){const st=getComputedStyle(p);if(+st.opacity===0){hidden=true;break}const stops=st.backgroundImage.match(/rgba?\([^)]+\)/g);if(st.backgroundImage!=='none'&&(!stops||st.backgroundImage.includes('url(')))complex=true;chain.push({base:rgba(st.backgroundColor),stops:(stops||[]).map(rgba)});}
  if(hidden)continue;if(complex){complexBackgrounds++;continue;}
  let backgrounds=[{r:255,g:255,b:255,a:1}];for(const layer of chain.reverse()){backgrounds=backgrounds.map(b=>over(layer.base,b));if(layer.stops.length)backgrounds=backgrounds.flatMap(b=>layer.stops.map(c=>over(c,b))).slice(0,32);}
  const ratio=Math.min(...backgrounds.map(background=>{const foreground=over(rgba(s.color),background),a=luminance(foreground),b=luminance(background);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)})),size=+s.fontSize.replace('px',''),required=size>=24||size>=18.66&&+s.fontWeight>=700?3:4.5;checked++;
  if(ratio+.01<required){const context=[];for(let p=e;p&&context.length<4;p=p.parentElement)context.push(p.tagName.toLowerCase()+'.'+p.className);failures.push({tag:e.tagName,className:e.className,context:context.join(' < '),text:text.slice(0,85),color:s.color,ratio:+ratio.toFixed(2),required});}
 }
 return{viewport:innerWidth,checked,complexBackgrounds,failures,pass:!failures.length};
}

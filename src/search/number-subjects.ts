const units=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const prefixes=['number','numbers','digit','digits','numeral','numerals'];
const quote=(word:string)=>'"'+word.replaceAll('"','""')+'"';
function written(number:number):string{
 if(number<20)return units[number];
 if(number<100)return tens[Math.floor(number/10)]+(number%10?' '+units[number%10]:'');
 if(number<1000)return units[Math.floor(number/100)]+' hundred'+(number%100?' '+written(number%100):'');
 return written(Math.floor(number/1000))+' thousand'+(number%1000?' '+written(number%1000):'');
}
export const writtenNumber=written;
function readNumber(words:string[],start:number):{number:number;end:number}|undefined{
 const token=words[start];
 if(/^\d{1,6}$/.test(token||''))return{number:Number(token),end:start+1};
 let best:{number:number;end:number}|undefined;
 // Compare complete standard names instead of summing arbitrary adjacent
 // words: “number two three” must not silently become number five.
 let total=0,part=0;
 for(let index=start;index<Math.min(words.length,start+12);index++){
  const word=words[index],unit=units.indexOf(word),ten=tens.indexOf(word);
  if(unit>=0)part+=unit;
  else if(ten>=2)part+=ten*10;
  else if(word==='hundred'&&part>0&&part<10)part*=100;
  else if(word==='thousand'&&part>0&&total===0){total=part*1000;part=0;}
  else if(word==='and'&&index>start)continue;
  else break;
  const number=total+part,name=words.slice(start,index+1).filter(w=>w!=='and').join(' ');
  if(number<=999999&&written(number)===name)best={number,end:index+1};
 }
 return best;
}
export interface NumberSubject {start:number;end:number;number:number;titleExpression:string}
/** Explicit numeral intent, including complete written names; never scene counts alone. */
export function numberSubjects(words:string[]):NumberSubject[]{
 const result:NumberSubject[]=[];
 for(let index=0;index<words.length;index++){
  if(!prefixes.includes(words[index]))continue;
  const parsed=readNumber(words,index+1);if(!parsed)continue;
  // A plural range/list is scene text, not a request for its first numeral's
  // collection. Intent words omit “from”, “to” and “and”, leaving adjacent values.
  if(['numbers','digits','numerals'].includes(words[index])&&readNumber(words,parsed.end))continue;
  const names=[String(parsed.number),written(parsed.number),...(parsed.number>=1000?[parsed.number.toLocaleString('en-US')]:[])];
  const phrases=prefixes.flatMap(prefix=>[...new Set(names)].map(name=>quote(prefix+' '+name)));
  result.push({start:index,...parsed,titleExpression:'title : ('+phrases.join(' OR ')+')'});index=parsed.end-1;
 }
 return result;
}

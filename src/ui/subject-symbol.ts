import symbols from '../content/topic-symbols.json';

/** Exact topic mappings; these original symbols never stand in for brand logos. */
export function subjectSymbol(topicId:string) {
 if(topicId==='race-car')return {src:'/topic-symbols/race-car.b274a8f4dcb6.svg',kind:'symbol' as const,surface:'none' as const,shape:'square' as const};
 if(!Object.prototype.hasOwnProperty.call(symbols,topicId))return;
 const symbol=symbols[topicId as keyof typeof symbols];
 return {src:symbol.src,kind:'symbol' as const,surface:'none' as const,shape:'square' as const};
}

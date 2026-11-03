/** Inspect the source page without altering its artwork, thin frame or owner logo. */
export function inspectSuppliedPagePixels(data:Uint8Array,width:number,height:number,channels=3){
 if(channels<3||data.length!==width*height*channels)throw Error('Invalid decoded supplied page');
 const left=width*.0363,right=width*.9637,top=height*.018,bottom=height*.9455;
 // Some supplied pages end the composition with a thin blue-gray horizontal
 // rule at a different height. Detect only long, narrow, dark neutral rules in
 // the bottom paper band, never colored fills in the drawing.
 const ruleRows:number[]=[];
 for(let y=Math.floor(height*.86);y<height*.95;y++){
  let neutralInk=0;for(let x=Math.ceil(left);x<right;x++){const p=(y*width+x)*channels,lo=Math.min(data[p],data[p+1],data[p+2]),hi=Math.max(data[p],data[p+1],data[p+2]);if(hi<100&&hi-lo<=48)neutralInk++;}
  if(neutralInk>width*.85)ruleRows.push(y);
 }
 const thinRuleRows=new Set<number>();
 for(let i=0;i<ruleRows.length;){let j=i+1;while(j<ruleRows.length&&ruleRows[j]===ruleRows[j-1]+1)j++;if(j-i<=Math.max(4,Math.ceil(height*.0035)))for(let y=ruleRows[i]-3;y<=ruleRows[j-1]+3;y++)thinRuleRows.add(y);i=j;}
 let logoPixels=0,frameChroma=0,edgeChroma=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const p=(y*width+x)*channels;
  if(Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2])<=16)continue;
  if(y>=height*.93&&x>=width*.65){logoPixels++;continue;}
  const frame=((Math.abs(x-left)<3||Math.abs(x-right)<3)&&y>=top-3&&y<=bottom+3)||((Math.abs(y-top)<3||Math.abs(y-bottom)<3)&&x>=left-3&&x<=right+3);
  const rule=thinRuleRows.has(y)&&x>=left-3&&x<=right+3&&Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2])<=48;
  if(frame||rule)frameChroma++;else edgeChroma++;
 }
 if(logoPixels<100)throw Error('Supplied logo missing');
 if(edgeChroma/(width*height)>.001)throw Error('Color outside supplied page frame and logo exceeds blank-source tolerance');
 return {logoPixels,frameChroma,edgeChroma};
}

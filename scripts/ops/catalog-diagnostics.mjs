import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const account='48c779c8eaa80234e0bb9d57f96e588b',script='jotcoloring-production';
export const DIAGNOSTIC_PAGES=Object.freeze({vehicles:'https://jotcoloring.com/collections/vehicles/','ages-9-12':'https://jotcoloring.com/coloring-by-age/9-12/','veterans-day':'https://jotcoloring.com/coloring-pages/veterans-day/'});
export function diagnosticPage(target='vehicles'){
 if(!Object.hasOwn(DIAGNOSTIC_PAGES,target))throw Error('Unknown diagnostic target');
 return DIAGNOSTIC_PAGES[target];
}
export function diagnosticHTMLSummary(html,page){
 const series_cards=(html.match(/data-series-id=/g)||[]).length;
 const gallery_cards=(html.match(/data-content-id=/g)||[]).length;
 const busy=html.includes('These coloring pages are temporarily busy')||html.includes('These pages could not be loaded.');
 const cards=page===DIAGNOSTIC_PAGES.vehicles?series_cards:gallery_cards;
 return {busy,series_cards,gallery_cards,ready:!busy&&cards>0};
}
/** @param {string} page Exact selected allowlisted URL, also validated at runtime. */
export function summarizeDiagnosticEvent(event,marker,page=DIAGNOSTIC_PAGES.vehicles){
 if(!Object.values(DIAGNOSTIC_PAGES).includes(page))return null;
 const request=event?.event?.request,headers=request?.headers||{};
 if(request?.url!==page||!Object.entries(headers).some(([k,v])=>k.toLowerCase()==='x-jot-diagnostic'&&v===marker))return null;
 const sanitize=value=>String(value).replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/(?:https?|wss?):\/\/\S+/g,'[URL redacted]').slice(0,1200);
 return {outcome:event.outcome,logs:(event.logs||[]).map(log=>({level:log.level,messages:(log.message||[]).map(value=>sanitize(typeof value==='string'?value:JSON.stringify(value)))})),exceptions:(event.exceptions||[]).map(e=>({name:e.name,message:sanitize(e.message)}))};
}
async function main(){
 const page=diagnosticPage(process.env.JOT_DIAGNOSTIC_TARGET||'vehicles');
 const token=process.env.CLOUDFLARE_API_TOKEN;if(!token)throw Error('Production diagnostic credentials unavailable');
 const marker=crypto.randomUUID(),events=[],checks=[];let tail,ws;
 const api=async(path,method)=>{const r=await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${script}${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(method==='POST'?{body:'{}'}:{}),signal:AbortSignal.timeout(15000)});const j=await r.json();if(!r.ok||!j.success)throw Error(`Tail API status ${r.status}; codes ${(j.errors||[]).map(e=>e.code).join(',')}`);return j.result;};
 try{
  tail=await api('/tails','POST');ws=new WebSocket(tail.url,'trace-v1');
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Diagnostic stream timeout')),12000);ws.onopen=()=>{clearTimeout(timer);ws.send(JSON.stringify({debug:false}));resolve();};ws.onerror=()=>{clearTimeout(timer);reject(Error('Diagnostic stream unavailable'));};});
  ws.onmessage=async message=>{try{const raw=typeof message.data==='string'?message.data:await message.data.text(),summary=summarizeDiagnosticEvent(JSON.parse(raw),marker,page);if(summary)events.push(summary);}catch{/* Discard unrelated/invalid telemetry without logging its bytes. */}};
  for(let attempt=1;attempt<=8;attempt++){
   const start=Date.now(),r=await fetch(page,{headers:{'X-Jot-Diagnostic':marker,'Cookie':'jot_catalog_probe=1'},signal:AbortSignal.timeout(25000)}),html=await r.text();
   checks.push({attempt,status:r.status,ms:Date.now()-start,...diagnosticHTMLSummary(html,page),ray:r.headers.get('cf-ray'),commit:r.headers.get('x-jotcoloring-commit')});
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  await new Promise(resolve=>setTimeout(resolve,4000));
  await fs.mkdir('.local',{recursive:true});await fs.writeFile('.local/catalog-diagnostics.json',JSON.stringify({checked_at:new Date().toISOString(),page,checks,events},null,2));
  console.log(JSON.stringify({requests:checks.length,failed:checks.filter(c=>c.status!==200||!c.ready).length,matching_trace_events:events.length,report:'.local/catalog-diagnostics.json'}));
 }finally{ws?.close();if(tail)await api('/tails/'+tail.id,'DELETE');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await main();process.stdout.write('',()=>process.exit(0));}
 catch(error){console.error(error instanceof Error?error.message:'Diagnostic failed');process.exit(1);}
}

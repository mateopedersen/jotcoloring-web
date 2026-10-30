import fs from 'node:fs/promises';
import {COLORING_TAXONOMY,categoryPath} from '../../src/taxonomy/catalog';
const args=process.argv.slice(2),arg=(key:string,fallback:string)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
const origin=new URL(arg('--origin','http://localhost:4322'));
if(!['localhost','127.0.0.1','staging.jotcoloring.com','jotcoloring.com'].includes(origin.hostname))throw new Error('Use a JotColoring or local origin.');
const results:unknown[]=[],queue=[...COLORING_TAXONOMY];
await Promise.all(Array.from({length:4},async()=>{while(queue.length){const c=queue.shift()!,url=new URL(categoryPath(c.id),origin),res=await fetch(url),html=await res.text();results.push({id:c.id,url:url.href,status:res.status,ok:res.ok&&!!html.match(/<h1[^>]*>[^<]/)&&!html.includes('<h1>This page wandered'),noindex:/name="robots" content="[^"]*noindex/.test(html)});}}));
await fs.mkdir('outputs/category-audit',{recursive:true});await fs.writeFile(arg('--output','outputs/category-audit/http-'+origin.hostname+'.json'),JSON.stringify(results,null,2));
const failed=results.filter((r:any)=>!r.ok);console.log(JSON.stringify({origin:origin.origin,pages:results.length,failed}));if(failed.length)process.exitCode=1;

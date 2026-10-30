import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';

// Follow static imports only. Dynamic PDF, neural processing, starter catalogs and
// sharing chunks must remain outside a page's initial dependency graph.
const directory='dist/client/_astro',files=fs.readdirSync(directory);
export function staticImports(source){return [...source.matchAll(/\bimport\s*(?:[^"';()]*?\bfrom\s*)?["']([^"']+)["']/g)].map(m=>m[1]);}
function graph(file,seen=new Set()){
 if(seen.has(file))return seen;seen.add(file);
 for(const specifier of staticImports(fs.readFileSync(path.join(directory,file),'utf8'))){
  if(!specifier.startsWith('./')||!specifier.endsWith('.js'))continue;
  const dependency=path.normalize(path.join(path.dirname(file),specifier));
  assert.ok(!dependency.startsWith('..'),'Dependency escaped the asset directory');graph(dependency,seen);
 }
 return seen;
}
const entries=[['PhotoConverter.',160_000],['MyArtwork.',160_000],['Studio.',200_000],['Layout.',30_000],['ShareDialog.',4_000]];
const results=[];
for(const [prefix,limit] of entries){
 const entry=files.find(f=>f.startsWith(prefix)&&f.endsWith('.js'));assert.ok(entry,`${prefix} build entry missing`);
 const dependencies=[...graph(entry)],buffers=dependencies.map(f=>fs.readFileSync(path.join(directory,f)));
 const bytes=buffers.reduce((n,b)=>n+b.length,0),gzipBytes=buffers.reduce((n,b)=>n+gzipSync(b).length,0);
 assert.ok(bytes<=limit,`${prefix} initial JS ${bytes} exceeds ${limit} bytes`);
 assert.ok(!dependencies.some(f=>/^pdf-engine\.|^starter-pages\.|^drawing-neural\./.test(f)),`${prefix} eagerly loads an optional engine`);
 results.push({entry:prefix,decodedBytes:bytes,gzipBytes,limit,files:dependencies.length});
}
console.log(JSON.stringify({status:'PASS',scope:'Static dependency graph per entry; excludes other page entries and dynamic imports',entries:results},null,2));

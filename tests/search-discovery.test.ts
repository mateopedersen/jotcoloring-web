import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {D1SearchProvider} from '../src/server/catalog';
import {searchTopicIds} from '../src/search/topics';
import type {Database,Statement} from '../src/server/types';

class LocalSearch implements Database{
 sql=new DatabaseSync(':memory:');
 constructor(){for(const f of fs.readdirSync('migrations/search').sort())this.sql.exec(fs.readFileSync('migrations/search/'+f,'utf8'));}
 prepare(query:string):Statement{let values:unknown[]=[];const self=this;return{bind(...args){values=args;return this},async all(){return{results:self.sql.prepare(query).all(...values as any),success:true} as any},async first(column?:string){const r=self.sql.prepare(query).get(...values as any);return(column?r?.[column]:r)||null as any},async run(){self.sql.prepare(query).run(...values as any);return{results:[],success:true} as any}};}
 async batch():Promise<any>{throw Error('Not used in these read/search checks');}async exec(sql:string){this.sql.exec(sql);}
}
test('plural numeral ranges find their literal scene without selecting the first endpoint collection',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,number:string)=>search.project({id,title,tags:'number '+number,categories:'education numbers',category_ids:['education','numbers'],source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-14'});
 await add('path-666-wide','Garden path displaying numbers from 663 to 669','666');
 await add('path-666-narrow','Garden path displaying numbers from 664 to 668','666');
 await add('signs-888','Garden signs showing the sequence 887, 888 and 889','888');
 await add('literal-663','Number 663 with Flowers','663');
 for(const [id,title] of [['path-666-wide','Garden path displaying numbers from 663 to 669'],['path-666-narrow','Garden path displaying numbers from 664 to 668']]){
  assert.deepEqual((await search.search(title)).ids,[id]);
  assert.deepEqual((await search.search(title,48,{number:'666',category:'numbers'})).ids,[id]);
  assert.equal((await search.search(title,48,{number:'888'})).total,0);
 }
 assert.deepEqual((await search.search('numbers 663 to 669')).ids,['path-666-wide']);
 assert.deepEqual((await search.search('numbers 664 and 668')).ids,['path-666-narrow']);
 assert.deepEqual((await search.search('number 663')).ids,['literal-663']);
 assert.deepEqual((await search.search('numbers 663')).ids,['literal-663']);
 assert.equal((await search.search('Garden path displaying numbers from 663 to 670')).total,0);
});
test('known short words still complete a newly published name; inflections, exact names and topic aliases stay relevant',async()=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');
 const add=async(id:string,title:string,categories:string,description='')=>search.project({id,title,description,categories,category_ids:categories.split(' '),tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-01',age_groups:['kids']});
 await add('blue','Blue Vase','objects');await add('bluey','Bluey Balloon Play','cartoons bluey','A dog reaches for a balloon.');
 await add('cat','Cat in a Garden','animals cats');await add('kitty','Hello Kitty in a Garden','cartoons hello-kitty');
 await add('mal','Mal with a Spellbook','cartoons descendants');
 await add('rumi','Rumi Sings','cartoons huntrix');await add('jinu','Jinu at a Record Shop','cartoons k-pop-demon-hunters');
 await add('beaver','Beaver Works on a Detailed Dam','animals','A beaver beside logs.');
 assert.deepEqual((await search.search('Beaver Works on a Detailed Dam')).ids,['beaver']);
 assert.ok((await search.search('blue')).ids.includes('bluey'));
 assert.deepEqual((await search.search('buley')).ids,['bluey']);
 assert.deepEqual((await search.search('bluey balloons')).ids,['bluey']);
 assert.deepEqual((await search.search('balloons bluey')).ids,['bluey']);
 assert.equal((await search.search('kitty')).ids[0],'kitty');
 assert.deepEqual((await search.search('disney descendants')).ids,['mal']);
 assert.deepEqual(new Set((await search.search('kpop')).ids),new Set(['rumi','jinu']));
 assert.deepEqual(new Set((await search.search('k-pop demon hunters')).ids),new Set(['rumi','jinu']));
 assert.deepEqual((await search.search('huntr/x')).ids,['rumi']);
 assert.equal((await search.search('unrelated garden planet')).total,0);
 assert.equal((await search.search('bluey',5,{category:'flowers'})).total,0);
 await search.project({id:'bluey',title:'Bluey Garden Helper',categories:'cartoons bluey',category_ids:['cartoons','bluey'],tags:'flower',source_version:2,visibility:'published',locale:'en',updated_at:'2026-11-02'});
 assert.deepEqual((await search.search('garden helper')).ids,['bluey']);
 assert.equal((await search.search('bluey balloon')).total,0);
 db.sql.close();
});
test('a franchise alias never expands the HUNTR/X group into the whole film',()=>{
 assert.deepEqual(searchTopicIds('HUNTR/X'),['huntrix']);
 assert.deepEqual(searchTopicIds('KPop Demon Hunters'),['k-pop-demon-hunters','huntrix']);
 assert.deepEqual(searchTopicIds('not a real collection'),[]);
});


/** Match the deployed D1 LIKE byte limit, while keeping real SQLite matching. */
function enforceD1LikeLimit(db:LocalSearch){
 const native=new DatabaseSync(':memory:'),match=native.prepare('SELECT ? LIKE ? ESCAPE ? AS matched');
 db.sql.function('like',{varargs:true,deterministic:true},(...args)=>{
  const [pattern,value,escape='\\']=args;
  if(typeof pattern!=='string'||typeof value!=='string'||typeof escape!=='string')return null;
  if(Buffer.byteLength(pattern)>50)throw new Error('LIKE or GLOB pattern too complex');
  return Number(match.get(value,pattern,escape)!.matched);
 });
 return native;
}
const addSearchDrawing=(search:D1SearchProvider,id:string,title:string)=>search.project({id,title,categories:'cartoons hello-kitty',category_ids:['cartoons','hello-kitty'],tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-01',age_groups:['kids']});

test('long literal title searches find the actual drawing under the D1 pattern limit',async(t)=>{
 const db=new LocalSearch(),native=enforceD1LikeLimit(db),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>{db.sql.close();native.close();});
 const titles=['Hello Kitty Waters a Flower-Filled Conservatory Garden','Hello Kitty Collects Shells Beside a Coastal Pavilion','Hello Kitty Celebrates Beside a Flowering Party Arch'];
 for(const [index,title] of titles.entries())await addSearchDrawing(search,'long-title-'+index,title);
 for(const [index,title] of titles.entries())assert.deepEqual((await search.search(title)).ids,['long-title-'+index]);
});

test('literal prefix ranking works across the 50-byte boundary and Unicode queries',async(t)=>{
 const db=new LocalSearch(),native=enforceD1LikeLimit(db),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>{db.sql.close();native.close();});
 const queries=['x'.repeat(49),'x'.repeat(50),'美しい庭園の花と静かな池の彩色風景'];
 assert.ok(Buffer.byteLength(queries[2])>50&&queries[2].length<50);
 for(const [index,query] of queries.entries())await addSearchDrawing(search,'prefix-boundary-'+index,query+' Scene');
 for(const [index,query] of queries.entries())assert.ok((await search.search(query)).ids.includes('prefix-boundary-'+index));
});

test('exact titles, literal prefixes and cursor order keep their existing ranking',async(t)=>{
 const db=new LocalSearch(),native=enforceD1LikeLimit(db),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>{db.sql.close();native.close();});
 for(const [id,title] of [['exact','Garden'],['prefix','Garden Fox'],['suffix','Fox Garden']])await addSearchDrawing(search,id,title);
 const first=await search.search('garden',1);assert.deepEqual(first.ids,['exact']);assert.equal(first.has_more,true);assert.ok(first.next_cursor);
 const second=await search.search('garden',1,{cursor:first.next_cursor!});assert.deepEqual(second.ids,['prefix']);assert.ok(second.next_cursor);
 const third=await search.search('garden',1,{cursor:second.next_cursor!});assert.deepEqual(third.ids,['suffix']);assert.equal(third.has_more,false);
});


test('numeral collection searches require the depicted title subject, not scene counts or larger numbers',async()=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');
 const add=async(id:string,title:string,tags:string)=>search.project({id,title,tags,description:tags,categories:'education numbers',category_ids:['education','numbers'],source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-02'});
 await add('digit-two','Number 2 With Two Flowers','number two counting flowers');
 await add('word-two','Number Two With Curved Sections','number two counting');
 await add('different-number','Two Kittens Beside Number 444','number four hundred forty four two kittens');
 await add('repeated-digits','Number 2222 With Nested Outlines','number two thousand two hundred twenty two');
 await add('arithmetic','198 Divided By 2 Machine','number math 198 2');
 await add('thousand','Number 1,000 With Flowers','number thousand flowers');
 for(const query of ['number 2','number two','numeral 2'])assert.deepEqual(new Set((await search.search(query,48,{category:'education',subcategory:'numbers'})).ids),new Set(['digit-two','word-two']));
 assert.deepEqual((await search.search('number 2 flowers')).ids,['digit-two']);
 assert.deepEqual((await search.search('number 2222')).ids,['repeated-digits']);
 assert.deepEqual((await search.search('number 1000')).ids,['thousand']);
 db.sql.close();
});

test('reviewed numeric subjects remain discoverable in equations and scene-specific titles',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=async(id:string,title:string,tags:string,categories='education numbers')=>search.project({id,title,tags,categories,category_ids:categories.split(' '),source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-02'});
 await add('equation-100','100 Equals 90 Plus 10 Activity','100 number one hundred');
 await add('boot-1001','Rain boot displaying 1001 and its written name','1001 number one thousand one');
 await add('display-999','Children beside a display showing 999 - 900 = 99','999 nine hundred ninety-nine number');
 await add('equation-99','198 Divided By 2 Machine','99 ninety-nine number math 2');
 await add('ambiguous','198 Divided By 2 Machine','number math 198 2');
 await add('different-subject','Two Kittens Beside Number 444','444 number four hundred forty-four two kittens');
 await add('unrelated','100 Balloons','100 number','celebrations');
 for(const q of ['number 100','number one hundred','numeral 100'])assert.deepEqual((await search.search(q)).ids,['equation-100']);
 for(const q of ['number 1001','number 1,001','number one thousand one'])assert.deepEqual((await search.search(q)).ids,['boot-1001']);
 for(const q of ['number 999','number nine hundred ninety-nine'])assert.deepEqual((await search.search(q)).ids,['display-999']);
 assert.equal((await search.search('number 2')).total,0);
 assert.deepEqual((await search.search('number 444')).ids,['different-subject']);
 assert.deepEqual((await search.search('number 100 activity')).ids,['equation-100']);
 assert.equal((await search.search('number 100',48,{category:'animals'})).total,0);
 assert.equal((await search.search('number 99')).total,0,'multiple numeric tags do not declare an unambiguous subject');
});

test('numeric subject search retains complete cursor coverage and literal title priority',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 for(let i=0;i<55;i++)await search.project({id:'number-100-'+i,title:i===0?'Number 100':'Scene '+i+' Displaying 100',tags:'100 number one hundred',categories:'education numbers',category_ids:['education','numbers'],source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-02'});
 const found=new Set<string>();let cursor:string|undefined;
 do{const page=await search.search('number 100',20,{cursor});assert.equal(page.total,55);if(!cursor)assert.equal(page.ids[0],'number-100-0');for(const id of page.ids){assert.ok(!found.has(id));found.add(id);}cursor=page.next_cursor||undefined;}while(cursor);
 assert.equal(found.size,55);
});

test('publishing another numeral cannot move existing collection items past a cursor',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=async(id:string,title:string,tags:string)=>search.project({id,title,tags,categories:'education numbers',category_ids:['education','numbers'],source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-02'});
 for(let i=0;i<55;i++)await add('stable-100-'+i,i%2?'Number 100 With Flowers '+i:'Scene '+i+' Displaying 100','100 number one hundred');
 const first=await search.search('number 100',20),found=new Set(first.ids);let cursor=first.next_cursor;
 for(let i=0;i<100;i++)await add('new-two-'+i,'Number 2 Beside A Tree '+i,'number two counting');
 while(cursor){const page=await search.search('number 100',20,{cursor});assert.equal(page.total,55);for(const id of page.ids){assert.ok(!found.has(id),'duplicate after corpus growth');found.add(id);}cursor=page.next_cursor;}
 assert.equal(found.size,55,'existing number activities remain reachable after unrelated publications');
});

test('topic and alias cursors keep every published member while unrelated drawings arrive',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=async(id:string,title:string,categories:string,description='')=>search.project({id,title,description,tags:'',categories,category_ids:categories.split(' '),source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-03'});
 for(let i=0;i<100;i++)await add('pompompurin-'+String(i).padStart(3,'0'),'Pompompurin: '+['A Book','Sleeping Beneath A Tall Tree','A Toy And Many Flowers'][i%3]+' '+i,'cartoons pompompurin');
 for(const query of ['Pompompurin','sanrio pompompurin']){
  const first=await search.search(query,24),found=new Set(first.ids);let cursor=first.next_cursor;
  for(let i=0;i<100;i++)await add(query.replace(/ /g,'-')+'-new-'+i,'Excavator: A Worksite With Several Trees And Pipes '+i,'vehicles excavator','A machine digs a trench beside plants.');
  while(cursor){const page=await search.search(query,24,{cursor});assert.equal(page.total,100);for(const id of page.ids){assert.ok(!found.has(id),'no repeated member after corpus growth');found.add(id);}cursor=page.next_cursor;}
  assert.equal(found.size,100,'every topic member stays reachable across changing corpus statistics');
 }
});


test('animal ages and machine sizes are specific queries rather than whole-topic aliases',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,categories:string,description:string)=>search.project({id,title,description,tags:categories.includes('cheetah')?'cheetah cheetahs':'excavator excavators digger diggers',categories,category_ids:categories.split(' '),source_version:2,visibility:'published',locale:'en',updated_at:'2026-11-03'});
 await add('adult-cheetah','Cheetah: Standing in Side Profile','animals cheetah','A slender cheetah stands with its tail lowered.');
 await add('cub-cheetah','Cheetah: A Cub Watching a Butterfly','animals cheetah','A cheetah cub looks up at a butterfly.');
 await add('full-excavator','Excavator: Loading a Quarry Truck','vehicles excavator','An excavator loads rocks into a truck.');
 await add('mini-excavator','Excavator: A Compact Garden Machine','vehicles excavator','A mini excavator digs beside a garden path.');
 assert.equal((await search.search('cheetah')).total,2);assert.equal((await search.search('digger')).total,2);
 for(const query of ['cheetah cub','cheetah cubs']){assert.deepEqual(searchTopicIds(query),[]);assert.deepEqual((await search.search(query)).ids,['cub-cheetah']);}
 assert.deepEqual(searchTopicIds('mini excavator'),[]);assert.deepEqual((await search.search('mini excavator')).ids,['mini-excavator']);
});

test('vehicle model queries retain every modifier instead of returning the whole manufacturer collection',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,description:string,categories='vehicles cars byd')=>search.project({id,title,description,tags:'',categories,category_ids:categories.split(' '),source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-08',age_groups:['kids']});
 await add('dolphin-rear','BYD Dolphin Rear View Coloring Page','A compact hatchback viewed from behind.');
 await add('dolphin-front','BYD Dolphin Front View Coloring Page','A compact hatchback viewed from the front.');
 await add('seal','BYD Seal Coloring Page','An electric sedan in side profile.');
 await add('fish','Dolphin Underwater Coloring Page','A dolphin swims near coral.','ocean');
 assert.equal((await search.search('byd')).total,3);
 assert.deepEqual(searchTopicIds('byd dolphin'),[]);
 assert.deepEqual(new Set((await search.search('byd dolphin')).ids),new Set(['dolphin-rear','dolphin-front']));
 for(const query of ['please help me find free printable BYD Dolphin coloring pages with the rear view for kids','BYD Dolphin rear view coloring page'])assert.deepEqual((await search.search(query)).ids,['dolphin-rear'],query);
 for(const query of ['give me a BYD seal coloring page','please can you suggest a BYD Seal coloring page','recommend a printable BYD Seal drawing',"I'm looking for a printable BYD Seal coloring page",'I’d like to see a BYD Seal drawing','can I have a BYD Seal coloring page'])assert.deepEqual((await search.search(query)).ids,['seal'],query);
 assert.deepEqual((await search.search('byd se')).ids,['seal'],'an unfinished model remains discoverable');
 assert.equal((await search.search('BYD Dolphin flying spaceship')).total,0,'never silently drop requested scene details');
});

test('late words in a long scene query and explicit letter identities remain searchable',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,categories:string)=>search.project({id,title,categories,category_ids:categories.split(' '),tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-08'});
 await add('panda-bamboo','Panda Eating Bamboo','animals pandas');await add('panda-ball','Panda With A Ball','animals pandas');
 await add('letter-a','Letter A With Apples','education alphabet letter-a');await add('letter-b','Letter B With Books','education alphabet letter-b');
 assert.deepEqual((await search.search('please can you help me find some free printable coloring pages with a panda eating bamboo')).ids,['panda-bamboo']);
 assert.deepEqual((await search.search('letter a')).ids,['letter-a']);
});

test('spelling correction uses bounded vocabulary queries for long misses',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 await addSearchDrawing(search,'kitty','Hello Kitty Watering Flowers');
 let reads=0;const prepare=db.prepare.bind(db);db.prepare=(sql:string)=>{reads++;return prepare(sql);};
 await search.search('unlikelyword anothermissing thirdmissing fourthmissing');
 assert.ok(reads<=5,'one known-word lookup, one match count, two vocabulary reads, and at most one corrected count');
 reads=0;await search.search('oneabsent twoabsent threeabsent fourabsent fiveabsent sixabsent');
 assert.equal(reads,2,'gibberish cannot trigger one database retry per token');
});

test('a model-specific cursor remains complete while unrelated content is published',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,categories:string)=>search.project({id,title,categories,category_ids:categories.split(' '),tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-08'});
 for(let i=0;i<55;i++)await add('dolphin-'+i,i%2?'BYD Dolphin Front View':'Side View Of A BYD Dolphin','vehicles cars byd');
 await add('other-byd','BYD Seal','vehicles cars byd');
 const first=await search.search('BYD Dolphin',20),ids=new Set(first.ids);let cursor=first.next_cursor;
 for(let i=0;i<80;i++)await add('unrelated-'+i,'Garden Flowers Beside A House '+i,'flowers');
 while(cursor){const page=await search.search('BYD Dolphin',20,{cursor});assert.equal(page.total,55);for(const id of page.ids){assert.ok(!ids.has(id));ids.add(id);}cursor=page.next_cursor;}
 assert.equal(ids.size,55);assert.ok(!ids.has('other-byd'));
});

test('compact model spelling preserves its numeric identity and meaningful class letters',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,categories:string)=>search.project({id,title,categories,category_ids:categories.split(' '),tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-08'});
 await add('atto-3','BYD Atto 3','vehicles cars byd');await add('atto-2','BYD Atto 2','vehicles cars byd');
 await add('i-4','BMW i 4','vehicles cars bmw');await add('4-series','BMW 4 Series','vehicles cars bmw');
 await add('f-488','Ferrari F488','vehicles cars ferrari');
 assert.deepEqual((await search.search('byd atto3')).ids,['atto-3']);assert.deepEqual((await search.search('bmw i4')).ids,['i-4']);
 assert.deepEqual((await search.search('bmw i 4')).ids,['i-4']);assert.equal((await search.search('ferrari f458')).total,0,'correction cannot change the requested model number');
});

test('franchise aliases inside longer requests preserve character and scene constraints',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,categories:string)=>search.project({id,title,categories,category_ids:categories.split(' '),tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-08'});
 await add('rumi-stage','Rumi On Stage','cartoons huntrix');await add('rumi-garden','Rumi In A Garden','cartoons huntrix');
 await add('jinu-stage','Jinu On Stage','cartoons k-pop-demon-hunters');await add('other-rumi','Rumi On Stage','people');
 await add('mal','Mal With A Spellbook','cartoons descendants');
 for(const query of ['kpop rumi stage','please find free k pop Rumi stage coloring pages','rumi on stage kpop','HUNTR/X Rumi stage'])assert.deepEqual((await search.search(query)).ids,['rumi-stage'],query);
 assert.deepEqual((await search.search('Disney Descendants Mal spellbook')).ids,['mal']);
 assert.equal((await search.search('kpop rumi missingvolcanoscene')).total,0,'an alias must never remove scene constraints');
 assert.equal((await search.search('rum kpop')).total,0,'only the actual final word gets prefix completion');
});

test('reviewed music artist qualifiers find the whole subject while scene modifiers remain required',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,topic:string,description='')=>search.project({id,title,description,categories:'music '+topic,category_ids:['music',topic],tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-11'});
 await add('khalid-mic','Khalid with a Microphone','khalid','A visible microphone.');
 await add('khalid-garden','Khalid in a Garden','khalid','Plants frame the portrait.');
 await add('chappell','Chappell Roan Portrait','chappell-roan');
 await add('ed','Ed Sheeran with a Guitar','ed-sheeran');
 await add('luke','Luke Combs with a Guitar','luke-combs');
 await add('future','Future at a Recording Desk','future');
 for(const [q,ids] of [['Khalid singer',['khalid-mic','khalid-garden']],['Chappell Roan singer',['chappell']],['Ed Sheeran singer',['ed']],['Luke Combs country singer',['luke']],['Future rapper coloring pages',['future']]] as [string,string[]][]){assert.deepEqual(new Set((await search.search(q)).ids),new Set(ids),q);}
 assert.deepEqual((await search.search('Khalid singer microphone')).ids,['khalid-mic']);
 assert.equal((await search.search('Khalid singer missingvolcanoscene')).total,0);
 assert.equal((await search.search('Khalid singer',48,{category:'animals'})).total,0);
 assert.deepEqual(searchTopicIds('dog singer'),[]);
});


test('X former-name queries find reviewed X artwork and retain scene and category filters',async(t)=>{
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=(id:string,title:string,categories:string)=>search.project({id,title,categories,category_ids:categories.split(' '),tags:'',source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-12'});
 await add('x-kite','X Logo Diamond Kite','social-media x');
 await add('x-lamp','X Logo Desk Lamp','social-media x');
 await add('unrelated-kite','Garden Kite','objects');
 for(const q of ['X formerly Twitter','Twitter','X Twitter']){
  assert.deepEqual(searchTopicIds(q),['x']);
  assert.deepEqual(new Set((await search.search(q)).ids),new Set(['x-kite','x-lamp']));
 }
 assert.deepEqual((await search.search('X formerly Twitter kite')).ids,['x-kite']);
 assert.equal((await search.search('X formerly Twitter',48,{category:'flowers'})).total,0);
});


test('a canonical subject wins over its parent alias and keeps every cursor member during publication',async(t)=>{
 assert.deepEqual(searchTopicIds('Guitar'),['guitar']);
 const db=new LocalSearch(),search=new D1SearchProvider(db,'test-cursor-secret-long-enough');t.after(()=>db.sql.close());
 const add=async(id:string,title:string,categories:string,description='')=>search.project({id,title,description,tags:'',categories,category_ids:categories.split(' '),source_version:1,visibility:'published',locale:'en',updated_at:'2026-11-12'});
 for(let i=0;i<100;i++)await add('guitar-'+String(i).padStart(3,'0'),i%17===0?'Seated Guitarist With a Footrest '+i:'An Acoustic Guitar With Strings '+i,'music instruments guitar','A musician plays an acoustic guitar.');
 await add('piano-only','Piano beside a Window','music instruments','A keyboard instrument.');
 const first=await search.search('Guitar',24,{category:'guitar'}),found=new Set(first.ids);assert.equal(first.total,100);let cursor=first.next_cursor;
 for(let i=0;i<150;i++)await add('unrelated-'+i,'Young Scientist Holding a Microscope '+i,'education science','A child examines a leaf.');
 while(cursor){const page=await search.search('Guitar',24,{category:'guitar',cursor});assert.equal(page.total,100);for(const id of page.ids){assert.ok(!found.has(id),'no repeats after unrelated publication');found.add(id);}cursor=page.next_cursor;}
 assert.equal(found.size,100);assert.ok([...found].some(id=>id==='guitar-000'),'guitarist headings remain reachable through reviewed topic membership');
 assert.ok(!(await search.search('Guitar',48)).ids.includes('piano-only'),'Guitar does not expand to all musical instruments');
});

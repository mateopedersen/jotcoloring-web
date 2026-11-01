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

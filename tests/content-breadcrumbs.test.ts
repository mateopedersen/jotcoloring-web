import test from 'node:test';
import assert from 'node:assert/strict';
import {contentBreadcrumbs} from '../src/ui/content-breadcrumbs';
import {pageSchema} from '../src/seo/page';
import {intentExpression} from '../src/search/intent';
const number={slug:'number-2-with-interlocking-diamonds',title:'Number 2 With Interlocking Diamonds',category:'education',categoryName:'Learning',category_ids:['education','numbers'],subcategory:'numbers',tags:['counting','number','two']};
test('reviewed number memberships expose both their parent collection and numeral subject',()=>{
 const crumbs=contentBreadcrumbs(number);
 assert.deepEqual(crumbs.map(c=>c.name),['Home','Learning','Numbers & Counting','Number 2',number.title]);
 const subject=new URL(crumbs[3].path,'https://jotcoloring.com');
 assert.equal(subject.pathname,'/coloring-pages/education/numbers/');assert.equal(subject.searchParams.get('q'),'number 2');
});
test('all recorded subtopics receive their real collection URL without inventing memberships',()=>{
 const item={...number,category:'animals',categoryName:'Animals',category_ids:['animals','cats'],subcategory:'cats',title:'Two Cats Beside A Window'};
 assert.deepEqual(contentBreadcrumbs(item).map(c=>c.path),['/','/coloring-pages/animals/','/coloring-pages/animals/cats/','/coloring/'+item.slug+'/']);
 assert.equal(contentBreadcrumbs({...item,category_ids:['animals']}).length,3);
});
test('the breadcrumb schema uses the same reviewed hierarchy as the visible links',()=>{
 const graph=pageSchema({origin:'https://jotcoloring.com',canonical:'/coloring/'+number.slug+'/',title:number.title,description:'A patterned numeral.',image:'/preview.webp',imageAlt:'Number 2',item:number})['@graph'];
 const schema=graph.find(x=>x['@type']==='BreadcrumbList') as any;
 assert.deepEqual(schema.itemListElement.map((c:any)=>c.name),contentBreadcrumbs(number).map(c=>c.name));
});
test('number-subject searches match digit and word spellings without changing ordinary scene counts',()=>{
 assert.match(intentExpression(['number','2']),/"2" OR "two"/);
 assert.match(intentExpression(['number','two']),/"2" OR "two"/);
 assert.doesNotMatch(intentExpression(['two','cats']),/"2"/);
});

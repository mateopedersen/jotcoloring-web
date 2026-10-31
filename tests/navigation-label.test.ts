import test from 'node:test';import assert from 'node:assert/strict';import {navigationLabel} from '../src/ui/navigation-label';
test('shared navigation labels capitalize every word without damaging brands, formats or numbers',()=>{
 for(const[input,expected]of [['Print at home','Print At Home'],['Browse printable pages','Browse Printable Pages'],['Favorites & artwork','Favorites & Artwork'],['How to use JotColoring','How To Use JotColoring'],['AI, PDF & WEBP downloads','AI, PDF & WEBP Downloads'],['ages 6–8','Ages 6–8']]){assert.equal(navigationLabel(input),expected);assert.equal(navigationLabel(navigationLabel(input)),expected);}
});

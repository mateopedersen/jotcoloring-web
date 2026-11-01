import {test} from 'node:test';import assert from 'node:assert/strict';
import {missingTopicIdentities,requireSearchableTopicIdentity} from '../src/taxonomy/topic-identity';
test('character names and tags alone do not replace a visible franchise identity',()=>{
 assert.deepEqual(missingTopicIdentities({title:'Rumi Holds a Lantern',description:'Rumi raises a lantern beside flowers.',category_ids:['cartoons','huntrix']}),['KPop Demon Hunters']);
 assert.throws(()=>requireSearchableTopicIdentity({title:'Mal Holds a Book',description:'Mal holds a dragon-emblem book.',category_ids:['cartoons','descendants']}),/Descendants/);
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Rumi Holds a Lantern',description:'K-pop Demon Hunters: Rumi raises a lantern beside flowers.',category_ids:['cartoons','huntrix','k-pop-demon-hunters']}));
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Minecraft Creeper Among Blocks',description:'A Creeper stands beside blocky trees.',category_ids:['video-games','minecraft']}));
});
test('topic checks preserve generic subjects and do not fabricate package age or difficulty names',()=>{
 assert.deepEqual(missingTopicIdentities({title:'Leaf-Patterned Teacup',description:'A teacup and saucer carry a leafy pattern.',category_ids:['objects']}),[]);
 assert.throws(()=>requireSearchableTopicIdentity({title:'Rounded Cat',description:'A rounded cat stretches beneath a heart.',category_ids:['dolls-toys','squishy']}),/Squishy/);
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Rounded Cat',description:'Squishy: A rounded cat stretches beneath a heart.',category_ids:['dolls-toys','squishy']}));
});

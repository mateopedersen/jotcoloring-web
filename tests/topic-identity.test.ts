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

test('character subtopics retain both their exact character and franchise identity',()=>{
 assert.throws(()=>requireSearchableTopicIdentity({title:'Amy Rose Holds a Hammer',description:'Amy Rose stands on a path.',category_ids:['video-games','sonic','amy-rose']}),/Sonic/);
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Amy Rose Holds a Hammer',description:'Sonic character Amy Rose stands on a path.',category_ids:['video-games','sonic','amy-rose']}));
 assert.throws(()=>requireSearchableTopicIdentity({title:'Rainbow Dash Flies Above Clouds',description:'Rainbow Dash spreads her wings.',category_ids:['cartoons','my-little-pony','rainbow-dash']}),/My Little Pony/);
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Rainbow Dash Flies Above Clouds',description:'My Little Pony character Rainbow Dash spreads her wings.',category_ids:['cartoons','my-little-pony','rainbow-dash']}));
});


test('FNAF and Bible metadata retain their reviewed searchable subject',()=>{
 assert.throws(()=>requireSearchableTopicIdentity({title:'Freddy Holds a Microphone',description:'Freddy stands beside a curtain.',category_ids:['video-games','fnaf']}),/Five Nights/);
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Freddy Holds a Microphone',description:"Five Nights at Freddy’s (FNAF): Freddy stands beside a curtain.",category_ids:['video-games','fnaf']}));
 assert.throws(()=>requireSearchableTopicIdentity({title:'Dove and Olive Leaf',description:'A dove carries a leaf.',category_ids:['bible']}),/Bible/);
 assert.doesNotThrow(()=>requireSearchableTopicIdentity({title:'Dove and Olive Leaf',description:'Bible illustration: A dove carries an olive leaf.',category_ids:['bible']}));
});

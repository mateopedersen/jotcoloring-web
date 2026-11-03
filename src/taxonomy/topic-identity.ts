/** Visible topic identity for newly authored copy. Never infer a topic from a filename. */
const identities:Readonly<Record<string,string>>={
 "sugar-skull":"Sugar Skull","veterans-day":"Veterans Day","christmas-tree":"Christmas Tree","january":"January","december":"December","all-souls-day":"All Souls' Day","cheetah":"Cheetah","excavator":"Excavator","gingerbread-house":"Gingerbread House","fall-leaf":"Fall Leaf",
 'hello-kitty':'Hello Kitty',bluey:'Bluey',barbie:'Barbie',sonic:'Sonic',minecraft:'Minecraft',
 mrbeast:'MrBeast','elon-musk':'Elon Musk','donald-trump':'Donald Trump',labubu:'Labubu',crybaby:'CRYBABY',pompompurin:'Pompompurin',cinnamoroll:'Cinnamoroll',kuromi:'Kuromi',monchhichi:'Monchhichi',mofusand:'Mofusand',chiikawa:'Chiikawa',smiski:'Smiski','sonny-angel':'Sonny Angel',zimomo:'Zimomo',pucky:'Pucky',hacipupu:'Hacipupu','twinkle-twinkle':'Twinkle Twinkle',hirono:'Hirono',skullpanda:'SKULLPANDA',
 huntrix:'KPop Demon Hunters','k-pop-demon-hunters':'KPop Demon Hunters',descendants:'Descendants',squishy:'Squishy',fnaf:"Five Nights at Freddy's",bible:'Bible'
};
const normalized=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
export function requiredTopicIdentities(categoryIds:readonly string[]){return [...new Set(categoryIds.map(id=>identities[id]).filter((s):s is string=>!!s))];}
export function missingTopicIdentities(input:{title:string;description?:string;category_ids:readonly string[]}){const copy=normalized(input.title+' '+(input.description||''));return requiredTopicIdentities(input.category_ids).filter(name=>!copy.includes(normalized(name)));}
export function requireSearchableTopicIdentity(input:{title:string;description?:string;category_ids:readonly string[]}){const missing=missingTopicIdentities(input);if(missing.length)throw new Error('Name the reviewed topic naturally in the title or description: '+missing.join(', '));}

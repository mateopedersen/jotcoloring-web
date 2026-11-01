/** Visible topic identity for newly authored copy. Never infer a topic from a filename. */
const identities:Readonly<Record<string,string>>={
 'hello-kitty':'Hello Kitty',bluey:'Bluey',barbie:'Barbie',sonic:'Sonic',minecraft:'Minecraft',
 huntrix:'KPop Demon Hunters','k-pop-demon-hunters':'KPop Demon Hunters',descendants:'Descendants',squishy:'Squishy'
};
const normalized=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]/g,'');
export function requiredTopicIdentities(categoryIds:readonly string[]){return [...new Set(categoryIds.map(id=>identities[id]).filter((s):s is string=>!!s))];}
export function missingTopicIdentities(input:{title:string;description?:string;category_ids:readonly string[]}){const copy=normalized(input.title+' '+(input.description||''));return requiredTopicIdentities(input.category_ids).filter(name=>!copy.includes(normalized(name)));}
export function requireSearchableTopicIdentity(input:{title:string;description?:string;category_ids:readonly string[]}){const missing=missingTopicIdentities(input);if(missing.length)throw new Error('Name the reviewed topic naturally in the title or description: '+missing.join(', '));}

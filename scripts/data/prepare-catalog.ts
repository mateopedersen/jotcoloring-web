import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const inventory=JSON.parse(await fs.readFile('docs/generated-artwork-inventory.json','utf8')).assets as {slug:string;source_path:string;review:{observations:string}}[];
const mapping:Record<string,{categories:string;title:string;description:string;tags:string}>={
 'woodland-friends':{categories:'animals,woodland',title:'Woodland friends',description:'A fox and a rabbit rest together among woodland flowers, berries and leafy branches.',tags:'fox,rabbit,flowers,leaves,woodland'},
 'hibiscus-garden':{categories:'flowers',title:'Hibiscus garden',description:'A broad hibiscus flower opens among buds, daisies and tropical leaves.',tags:'hibiscus,flowers,tropical,leaves'},
 'friendly-dragon':{categories:'fantasy',title:'Friendly dragon',description:'A smiling winged dragon sits in a flower garden in front of a turreted storybook castle.',tags:'dragon,castle,fantasy,flowers'},
 'botanical-mandala':{categories:'mandalas,flowers',title:'Botanical mandala',description:'Concentric petals, leaves and tiny flowers form an elongated botanical mandala.',tags:'mandala,petals,leaves,pattern'},
 'winter-wishes':{categories:'holidays',title:'Winter wishes',description:'A snowman in a knitted cap and scarf stands among presents, fir branches and hanging baubles.',tags:'snowman,winter,Christmas,presents'},
 'camper-adventure':{categories:'vehicles',title:'Camper adventure',description:'An unbadged rounded camper van and surfboards sit beside a tropical shore lined with palms.',tags:'camper,van,beach,surfboard,palms'},
 'space-explorer':{categories:'space',title:'Space explorer',description:'A smiling fictional astronaut floats among ringed planets, stars and small space rocks.',tags:'astronaut,space,planets,stars'},
 'ocean-adventure':{categories:'ocean,animals,ocean-life',title:'Ocean adventure',description:'A sea turtle swims through coral and seaweed alongside small tropical fish.',tags:'turtle,ocean,coral,fish,underwater'},
 'sweet-treats':{categories:'food,holidays',title:'Sweet treats',description:'Swirled cupcakes, berries and sweets fill a playful dessert arrangement.',tags:'cupcake,dessert,berries,sweets'},
 'dinosaur-valley':{categories:'dinosaurs,animals',title:'Dinosaur valley',description:'A long-necked dinosaur stands among prehistoric plants beneath distant mountain peaks.',tags:'dinosaur,prehistoric,plants,mountains'},
 'cozy-bookshop':{categories:'fantasy',title:'Cozy bookshop',description:'An inviting storybook bookshop has full display windows and potted flowers around its entrance.',tags:'bookshop,books,shop,flowers,building'},
 'dream-castle':{categories:'fantasy',title:'Dream castle',description:'A fairy-tale castle with pointed towers rises above a winding path and flower-filled grounds.',tags:'castle,towers,fairy-tale,flowers'},
 'butterfly-garden':{categories:'flowers,animals',title:'Butterfly garden',description:'A butterfly spreads its patterned wings among daisies, buds and hibiscus-like flowers.',tags:'butterfly,wings,flowers,garden'},
 'sleepy-kitten':{categories:'animals,pets',title:'Sleepy kitten',description:'A fluffy kitten sleeps beside a ball of yarn among daisies and garden foliage.',tags:'kitten,cat,yarn,sleeping,garden'},
 'gentle-deer':{categories:'animals,woodland',title:'Gentle deer',description:'A spotted fawn rests among daisies and ferns with a woodland stream behind it.',tags:'deer,fawn,forest,ferns,stream'},
 'little-hedgehog':{categories:'animals,woodland',title:'Little hedgehog',description:'A round hedgehog walks among fallen leaves, acorns and mushrooms beside a log.',tags:'hedgehog,leaves,mushrooms,woodland'},
 'woodland-owl':{categories:'animals,birds,woodland',title:'Woodland owl',description:'An owl perches on a flowering branch beneath a crescent moon and stars.',tags:'owl,bird,moon,stars,branch'},
 'playful-puppy':{categories:'animals,pets',title:'Playful puppy',description:'A floppy-eared puppy sits with a ball at its paws in a garden of daisies.',tags:'puppy,dog,ball,daisies,garden'},
 'farm-friends':{categories:'animals,farm-animals',title:'Farm friends',description:'A young cow with outlined coat patches stands among daisies beside a fence and barn.',tags:'cow,farm,barn,daisies'}
};
const all=[{slug:'woodland-friends',source_path:'public/assets/originals/woodland-friends.png'},...inventory];
const root=path.resolve(process.argv[2]||'../../media');const selected=process.argv[3]?new Set(process.argv[3].split(',')):null;
for(const art of all){if(selected&&!selected.has(art.slug))continue;const m=mapping[art.slug];if(!m)throw new Error('Missing reviewed metadata '+art.slug);const args=['--import','tsx','scripts/data/prepare-media.ts','--input',art.source_path,'--id','jc-'+art.slug,'--slug',art.slug,'--title',m.title,'--description',m.description,'--alt',m.description,'--categories',m.categories,'--tags',m.tags,'--ages','teens,adults','--difficulty','detailed','--output',path.join(root,art.slug)];const color=`public/assets/colors/${art.slug}.png`;try{await fs.access(color);args.push('--color',color)}catch{}const r=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});if(r.status!==0)throw new Error('Preparation failed '+art.slug)}

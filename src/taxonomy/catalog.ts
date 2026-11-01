/** Stable, curated taxonomy. Adding a topic here does not fabricate catalog items. */
export const TAXONOMY_VERSION='jot-taxonomy-2.3.0';
export const FOLLOWUP_EDITORIAL_TAXONOMY_VERSION='jot-taxonomy-2.2.0';
export const EXPANSION_EDITORIAL_CATEGORY_IDS=new Set(['turtles','trick-or-treat','bible','fnaf','pandas']);
export const PREVIOUS_EDITORIAL_TAXONOMY_VERSION='jot-taxonomy-2.1.0';
export const FOLLOWUP_EDITORIAL_CATEGORY_IDS=new Set(['descendants','squishy','k-pop-demon-hunters']);
/** The image classifier's label vocabulary is unchanged by manually reviewed character topics. */
export const VISION_TAXONOMY_VERSION='jot-taxonomy-2.0.0';
export interface ColoringCategory {id:string;name:string;topic:string;parent:string|null;visual:string;icon:string;sample:string;intro:string;aliases:string[];editorial_only?:boolean}
const roots=`animals|Animals|Animal|animals|animals such as cats, dogs, cows, foxes, deer, birds and insects|Creatures big and small|animal,wildlife
flowers|Flowers|Flower|flowers|flowers, petals and botanical floral arrangements|Petals, leaves and blooms|flower,floral,botanical
fantasy|Fantasy|Fantasy|fantasy|imaginary creatures, dragons, unicorns, fairies and magical castles|Make-believe worlds|magic,fairy tale
mandalas|Mandalas|Mandala|mandalas|circular symmetric mandalas with repeating radial patterns|Patterns from the center out|mandala,radial
holidays|Holidays|Holiday|holidays|recognizable holiday symbols and festive decorations|Celebrate through the seasons|holiday,festive
vehicles|Vehicles|Vehicle|vehicles|cars, trucks, buses, trains, boats or airplanes|Wheels, wings and adventures|vehicle,transport,transportation
space|Space|Space|space|planets, astronauts, rockets and outer space|Explore a universe of color|astronomy,outer space
 ocean|Ocean|Ocean|ocean|marine creatures, coral reefs and underwater ocean scenes|Life beneath the waves|marine,underwater,sea
food|Food|Food|food|food, fruit, vegetables, desserts or drinks|Color something delicious|food,cooking
 dinosaurs|Dinosaurs|Dinosaur|dinosaurs|prehistoric dinosaurs and pterosaurs|Prehistoric adventures|dinosaur,prehistoric
nature|Nature|Nature|nature|landscapes, trees, mountains, forests and natural scenery|Explore the great outdoors|landscape,scenery,outdoors
buildings|Buildings & Places|Building|buildings|buildings, architecture, houses, shops and streets|Homes, streets and places|building,architecture,house
people|People|People|people|people, portraits, families, friends and everyday human activities|Faces, families and friends|person,human,family
education|Learning|Learning|education|alphabet letters, numbers, classroom objects or educational worksheets|Letters, numbers and discoveries|educational,alphabet,learning
sports|Sports|Sports|sports|sports equipment, athletes and sporting activities|Ready, set, color|sport,athletics
objects|Everyday Objects|Everyday Object|objects|household objects, tools, toys or furniture|Find beauty in everyday things|object,household
music|Music|Music|music|musical instruments, musicians and music notation|Bring a little rhythm to the page|musical,instrument
fashion|Fashion|Fashion|fashion|clothing, shoes, hats, jewelry and accessories|Patterns and personal style|clothing,clothes,accessory
robots|Robots|Robot|robots|robots and mechanical robot characters|Friendly machines and inventions|robot,robotic
seasons|Seasons & Weather|Season & Weather|seasons|weather, seasonal scenery, rain, snow or sunshine|A new season of color|weather,season
celebrations|Celebrations|Celebration|celebrations|birthdays, parties, weddings and non-holiday celebrations|Make a colorful occasion|party,celebration,birthday
art-patterns|Art & Patterns|Art & Pattern|art-patterns|abstract patterns, decorative motifs and art supplies|Lines, shapes and creative patterns|abstract,pattern,art`;
const children=`woodland|Woodland|animals|foxes, deer, hedgehogs, squirrels and woodland wildlife|forest animals
pets|Pets|animals|pet cats, dogs, puppies, kittens or pet rabbits|pet
farm-animals|Farm Animals|animals|cows, sheep, pigs, goats, horses and farmyard animals|farm animal
birds|Birds|animals|owls, parrots, songbirds, eagles and other birds|bird
insects|Insects & Bugs|animals|bees, beetles, ladybugs, dragonflies and other insects|bug,insect
butterflies|Butterflies|animals|butterflies with patterned wings|butterfly
jungle-animals|Jungle Animals|animals|monkeys, tigers and tropical jungle wildlife|jungle,safari
safari-animals|Safari Animals|animals|lions, elephants, giraffes, zebras and savanna wildlife|savanna,safari
reptiles|Reptiles|animals|snakes, lizards, crocodiles and tortoises|reptile
polar-animals|Polar Animals|animals|polar bears, penguins, seals and arctic wildlife|arctic,antarctic
cats|Cats & Kittens|animals|cats and kittens|cat,kitten
 dogs|Dogs & Puppies|animals|dogs and puppies|dog,puppy
roses|Roses|flowers|rose flowers with layered petals and thorny stems|rose
sunflowers|Sunflowers|flowers|large sunflowers with seed centers|sunflower
bouquets|Flower Bouquets|flowers|arranged bunches of cut flowers and bouquets|bouquet
 garden-flowers|Garden Flowers|flowers|mixed garden flowers, daisies, tulips or hibiscus|garden flower
dragons|Dragons|fantasy|fantasy dragons with wings, scales and tails|dragon
unicorns|Unicorns|fantasy|unicorns with a single horn|unicorn
fairies|Fairies|fantasy|small magical fairies with wings|fairy
magical-castles|Magical Castles|fantasy|imaginary fairy-tale castles with turrets|castle
mermaids|Mermaids|fantasy|mermaids with human torsos and fish tails|mermaid
floral-mandalas|Floral Mandalas|mandalas|radially symmetric mandalas made of petals and flowers|flower mandala
geometric-mandalas|Geometric Mandalas|mandalas|radially symmetric mandalas of geometric shapes|geometric mandala
animal-mandalas|Animal Mandalas|mandalas|animals decorated with symmetric mandala patterns|animal mandala
christmas|Christmas|holidays|Christmas trees, Santa, stockings and Christmas ornaments|xmas
halloween|Halloween|holidays|jack-o-lanterns, trick-or-treat costumes and Halloween symbols|spooky
 easter|Easter|holidays|Easter eggs, Easter baskets and Easter bunnies|easter egg
thanksgiving|Thanksgiving|holidays|Thanksgiving turkeys, cornucopias and harvest meals|thanksgiving
valentines-day|Valentine’s Day|holidays|Valentine cards, love hearts and Valentine gifts|valentine
hanukkah|Hanukkah|holidays|Hanukkah menorahs and dreidels|chanukah
eid|Eid|holidays|Eid lanterns, crescent decorations and Eid celebrations|eid al fitr
diwali|Diwali|holidays|Diwali diyas, rangoli and festival lamps|deepavali
cars|Cars|vehicles|passenger cars, race cars and camper vans|car,camper
trucks|Trucks|vehicles|large trucks, dump trucks or fire engines|truck,lorry
trains|Trains|vehicles|railway trains, locomotives and railroad cars|train,locomotive
aircraft|Aircraft|vehicles|airplanes and helicopters with wings or rotors|airplane,helicopter,plane
boats|Boats & Ships|vehicles|boats, sailboats and ships on water|boat,ship
bicycles|Bicycles|vehicles|bicycles with two wheels and pedals|bicycle,bike
construction-vehicles|Construction Vehicles|vehicles|excavators, bulldozers and construction machinery|excavator,bulldozer
astronauts|Astronauts|space|astronauts wearing space suits|astronaut
planets|Planets & Solar System|space|planets, rings and solar system diagrams|planet,solar system
rockets|Rockets|space|space rockets and spacecraft|rocket,spacecraft
 ocean-life|Ocean Life|animals|marine animals and underwater ocean life|sea life
sea-turtles|Sea Turtles|ocean|marine sea turtles swimming underwater|sea turtle
fish|Fish|ocean|fish with fins, scales and tails|fish
sharks|Sharks|ocean|sharks with dorsal fins and streamlined bodies|shark
whales-dolphins|Whales & Dolphins|ocean|whales or dolphins swimming in water|whale,dolphin
coral-reefs|Coral Reefs|ocean|underwater coral reefs with corals and marine life|coral,reef
fruit|Fruit|food|apples, oranges, bananas, strawberries and other fruit|fruit,berry
vegetables|Vegetables|food|carrots, broccoli, tomatoes and other vegetables|vegetable
 desserts|Desserts|food|cupcakes, cakes, ice cream, candy and sweet treats|dessert,cupcake,cake
meals|Meals|food|pizza, sandwiches, burgers and prepared meals|meal,pizza
 drinks|Drinks|food|cups, bottles and glasses of beverages|drink,beverage
 tyrannosaurus|Tyrannosaurus|dinosaurs|tyrannosaurus dinosaurs with large heads and small front arms|t rex,tyrannosaurus
long-neck-dinosaurs|Long-Neck Dinosaurs|dinosaurs|long-necked sauropod dinosaurs|sauropod,brontosaurus
horned-dinosaurs|Horned Dinosaurs|dinosaurs|triceratops and other horned dinosaurs|triceratops
mountains|Mountains|nature|mountain peaks and rocky mountain scenery|mountain
forests|Forests & Trees|nature|trees, leaves and woodland landscapes|tree,forest
beaches|Beaches|nature|coastal beaches, sand, palm trees and seashores|beach,seashore
waterfalls|Waterfalls & Rivers|nature|rivers, streams and cascading waterfalls|waterfall,river
houses|Houses & Homes|buildings|realistic homes, cottages and houses|house,home
cities|Cities & Streets|buildings|city skylines, buildings and street scenes|city,street
landmarks|Landmarks|buildings|monuments, bridges and architectural landmarks|landmark,bridge
farms|Farms|buildings|barns, farmyards and rural farm buildings|barn,farm
family|Family & Friends|people|families, parents, children and friends together|family,friend
portraits|Portraits|people|human faces and portrait drawings|portrait,face
occupations|Jobs & Helpers|people|firefighters, doctors, teachers and community helpers|job,occupation,helper
alphabet|Alphabet|education|alphabet letters and letter-tracing worksheets|abc,letter
numbers|Numbers & Counting|education|numbers, counting pictures and arithmetic worksheets|number,counting,math
shapes|Shapes|education|simple circles, squares, triangles and basic shapes|shape,geometry
school|School|education|school supplies, books and classrooms|classroom,school
soccer|Soccer|sports|soccer balls, soccer goals and soccer players|soccer,football
basketball|Basketball|sports|basketballs, hoops and basketball players|basketball
baseball|Baseball|sports|baseball bats, balls, gloves and baseball players|baseball
winter-sports|Winter Sports|sports|skiing, skating, snowboarding and winter sports equipment|ski,skate
 toys|Toys|objects|toys, teddy bears, dolls, blocks and toy objects|toy,teddy bear
 tools|Tools|objects|hand tools, hammers, wrenches and screwdrivers|tool
 furniture|Furniture|objects|chairs, tables, beds and other furniture|furniture
instruments|Musical Instruments|music|guitars, pianos, drums, violins and other instruments|guitar,piano,drum
musical-notes|Musical Notes|music|music notes, treble clefs and notation|music note
outfits|Clothing & Outfits|fashion|shirts, dresses, trousers and outfits|outfit,dress,shirt
accessories|Fashion Accessories|fashion|shoes, hats, bags and jewelry|hat,shoe,bag
spring|Spring|seasons|spring blossoms, new leaves and spring scenery|spring
summer|Summer|seasons|summer sunshine, summer activities and summer scenery|summer
 autumn|Fall|seasons|fall foliage, autumn leaves and autumn scenery|autumn,fall
winter|Winter|seasons|snowflakes, snowmen and snowy winter scenes|winter,snow
weather|Weather|seasons|rainbows, clouds, sunshine, rain and lightning|rainbow,rain,cloud
birthdays|Birthdays|celebrations|birthday cakes, candles, presents and balloons|birthday
parties|Parties|celebrations|party decorations, balloons and celebration scenes|party
weddings|Weddings|celebrations|wedding couples, rings and wedding celebrations|wedding
 geometric-patterns|Geometric Patterns|art-patterns|repeating geometric shapes and abstract patterns without radial mandala symmetry|geometric,abstract
art-supplies|Art Supplies|art-patterns|paintbrushes, pencils, palettes and art materials|art supply,pencil`;
const samples:Record<string,string>={animals:'woodland-friends',flowers:'hibiscus-garden',fantasy:'friendly-dragon',mandalas:'botanical-mandala',holidays:'winter-wishes',vehicles:'camper-adventure',space:'space-explorer',ocean:'ocean-adventure',food:'sweet-treats',dinosaurs:'dinosaur-valley',woodland:'woodland-friends',pets:'sleepy-kitten','farm-animals':'farm-friends','ocean-life':'ocean-adventure',birds:'woodland-owl'};
const subjectIcons=new Set(['woodland','pets','farm-animals','birds','insects','butterflies','jungle-animals','safari-animals','reptiles','polar-animals','cats','dogs','ocean-life','sea-turtles','dragons']);
const top=roots.trim().split('\n').map(row=>{const [id,name,topic,icon,visual,intro,aliases]=row.trim().split('|');return{id,name,topic,parent:null,visual,icon,sample:samples[id]||'',intro,aliases:aliases.split(',')} as ColoringCategory});
const editorialRoots:ColoringCategory[]=[
 {id:'bible',name:'Bible',topic:'Bible',parent:null,visual:'illustrations inspired by Bible stories and Christian symbols',icon:'bible',sample:'',intro:'Explore Bible story scenes, familiar Christian symbols, and outlined words for coloring. Doves, arks, shepherds, and illustrated stories range from open outlines to detailed compositions.',aliases:['bible stories','biblical','scripture','christian'],editorial_only:true},
 {id:'cartoons',name:'Characters & Cartoons',topic:'Cartoon Character',parent:null,visual:'known cartoon characters and illustrated mascots',icon:'cartoons',sample:'',intro:'Hello Kitty, Bluey, Descendants, and KPop Demon Hunters characters appear in playful portraits and imagined adventures. Browse by character for music, crafts, gardens, magical settings, and varied coloring detail.',aliases:['cartoon characters','cartoon','characters'],editorial_only:true},
 {id:'dolls-toys',name:'Dolls & Toys',topic:'Doll & Toy',parent:null,visual:'recognizable toy and doll characters',icon:'dolls-toys',sample:'',intro:'Barbie characters and rounded squishy-style mascots explore creative hobbies, sweet shops, gardens, and imagined adventures. Find open character outlines alongside detailed scenes filled with outfits, treats, toys, and decorative patterns.',aliases:['doll characters','dolls','toy characters'],editorial_only:true},
 {id:'video-games',name:'Video Games',topic:'Video Game',parent:null,visual:'recognizable video game characters and worlds',icon:'video-games',sample:'',intro:'Explore Sonic adventures, Five Nights at Freddy’s characters, and Minecraft-inspired block worlds, from familiar characters and friendly mobs to building projects and richly imagined settings.',aliases:['video game','game characters','gaming'],editorial_only:true}
];
const editorialTopics:ColoringCategory[]=[
 {id:'turtles',name:'Turtles',topic:'Turtle',parent:'animals',visual:'turtles and tortoises on land and in water',icon:'sea-turtles',sample:'',intro:'Sea turtles glide through underwater scenes while freshwater turtles and tortoises explore ponds, logs, and gardens. Look for patterned shells, hatching turtles, and detailed habitats.',aliases:['turtle','tortoise','tortoises','terrapin','terrapins'],editorial_only:true},
 {id:'pandas',name:'Pandas',topic:'Panda',parent:'animals',visual:'giant pandas with rounded ears and dark eye patches',icon:'pandas',sample:'',intro:'Pandas snack on bamboo, rest in trees, play, and explore leafy settings. Choose an open character drawing or a scene filled with bamboo and woodland details.',aliases:['panda','giant panda','panda bear'],editorial_only:true},
 {id:'trick-or-treat',name:'Trick or Treat',topic:'Trick or Treat',parent:'holidays',visual:'Halloween trick-or-treat costumes, candy buckets and decorated doorsteps',icon:'holidays',sample:'',intro:'Costumed trick-or-treaters visit decorated doorsteps with candy buckets and treat bags. Explore friendly ghosts, jack-o-lanterns, and neighborhood Halloween scenes.',aliases:['trick or treat','trick-or-treat','trickortreat','trick or treating'],editorial_only:true},
 {id:'fnaf',name:"Five Nights at Freddy's",topic:"Five Nights at Freddy's",parent:'video-games',visual:"Five Nights at Freddy's animatronic character illustrations",icon:'video-games',sample:'',intro:'Freddy, Bonnie, Chica, Foxy, and other Five Nights at Freddy’s characters appear in expressive poses and imagined activities. Explore familiar animatronic details and elaborate stage settings.',aliases:['fnaf',"five nights at freddy's",'five nights at freddys'],editorial_only:true},
 {id:'sonic',name:'Sonic',topic:'Sonic',parent:'video-games',visual:'Sonic the Hedgehog characters',icon:'video-games',sample:'',intro:'Sonic, Tails, Amy, and Knuckles appear in running, gardening, music, workshop, and adventure scenes, from open outlines to detailed settings.',aliases:['sonic the hedgehog'],editorial_only:true},
 {id:'hello-kitty',name:'Hello Kitty',topic:'Hello Kitty',parent:'cartoons',visual:'Hello Kitty character artwork',icon:'fantasy',sample:'',intro:'Hello Kitty picks apples, pours tea, makes crafts, gardens, and plays music. The collection ranges from simple character outlines to richly decorated rooms and outdoor scenes.',aliases:['hello kitty'],editorial_only:true},
 {id:'barbie',name:'Barbie',topic:'Barbie',parent:'dolls-toys',visual:'Barbie character artwork',icon:'people',sample:'',intro:'Barbie gardens, cares for pets, makes art, explores space, and shares activities with friends. Choose a simple character drawing or a scene with a detailed background.',aliases:['barbie doll'],editorial_only:true},
 {id:'bluey',name:'Bluey',topic:'Bluey',parent:'cartoons',visual:'Bluey cartoon character artwork',icon:'fantasy',sample:'',intro:'Bluey family characters play, garden, build, make crafts, and explore outdoors. Choose a simple character scene or a detailed family activity with a room or garden background.',aliases:['bluey heeler'],editorial_only:true},
 {id:'minecraft',name:'Minecraft',topic:'Minecraft',parent:'video-games',visual:'Minecraft block-style characters and worlds',icon:'fantasy',sample:'',intro:'Familiar Minecraft mobs and block-style builders appear in farms, villages, underwater gardens, and imagined adventures. Choose clear outlines or scenes filled with architectural detail.',aliases:['minecraft game'],editorial_only:true},
 {id:'princesses',name:'Princesses',topic:'Princess',parent:'fantasy',visual:'storybook princess characters',icon:'fantasy',sample:'',intro:'Storybook princesses explore gardens, play music, read, make crafts, and care for animals. Simple character drawings sit beside detailed castles and imaginative landscapes.',aliases:['princess'],editorial_only:true},
 {id:'descendants',name:'Descendants',topic:'Descendants',parent:'cartoons',visual:'Disney Descendants character illustrations',icon:'cartoons',sample:'',intro:'Mal, Evie, Carlos, Jay, Uma, and their friends explore imagined royal gardens, pirate harbors, workshops, and magical rooms. Portraits and elaborate group scenes offer a range of coloring detail.',aliases:['disney descendants'],editorial_only:true},
 {id:'squishy',name:'Squishy',topic:'Squishy',parent:'dolls-toys',visual:'rounded squishy-style toy and mascot illustrations',icon:'dolls-toys',sample:'',intro:'Rounded animal mascots and smiling food characters fill this squishy-style collection. Choose open character outlines or playful shops, gardens, craft tables, and imagined adventures.',aliases:['squishies','squishy toys'],editorial_only:true},
 {id:'k-pop-demon-hunters',name:'KPop Demon Hunters',topic:'KPop Demon Hunters',parent:'cartoons',visual:'KPop Demon Hunters animated film characters',icon:'cartoons',sample:'',intro:'Derpy, Sussie, the Saja Boys, and HUNTR/X characters appear in playful portraits, music scenes, and imagined adventures. Explore expressive creatures, familiar hairstyles, and detailed settings.',aliases:['kpop demon hunters','k-pop demon hunters'],editorial_only:true},
 {id:'huntrix',name:'HUNTR/X',topic:'HUNTR/X',parent:'cartoons',visual:'HUNTR/X animated characters',icon:'fantasy',sample:'',intro:'Rumi, Mira, and Zoey sing, dance, make crafts, and explore imagined city and garden settings. Find simple character poses alongside detailed performance and fantasy scenes.',aliases:['huntrix','huntr/x'],editorial_only:true}
];
export const EDITORIAL_REVIEW_CATEGORY_IDS=new Set([...editorialRoots,...editorialTopics].map(c=>c.id));
export const COLORING_TAXONOMY:readonly ColoringCategory[]=[...top,...editorialRoots,...children.trim().split('\n').map(row=>{const [id,name,parent,visual,aliases]=row.trim().split('|'),root=top.find(x=>x.id===parent)!;return{id,name,topic:name,parent,visual,icon:subjectIcons.has(id)?id:root.icon,sample:samples[id]||'',intro:`Explore ${name.toLowerCase()} coloring pages. Choose a PDF or image to print, or add your own colors in Studio.`,aliases:aliases.split(',')} as ColoringCategory}),...editorialTopics];
const reviewedCatalogIntros:Record<string,string>={"animals":"Meet lions, elephants, woodland animals, pandas, koalas, and other wildlife in simple poses and detailed habitats. Pet, farm, ocean, and polar themes offer more ways to explore the collection.","flowers":"Explore roses, tulips, daisies, sunflowers, orchids, and other blossoms, from single stems to bouquets and elaborate gardens. Petal shapes, leaves, patterned pots, and glasshouse details give each page a different focus.","mandalas":"Petals, leaves, stars, paisley curls, butterflies, and fish form repeating circular designs. Choose broad shapes with open centers or tightly layered patterns with fine details.","dinosaurs":"Horned dinosaurs, plated backs, long necks, feathered forms, and hatchlings appear among ferns, rivers, and rocky landscapes. The drawings range from single animals to detailed forest and nesting scenes.","cats":"Kittens and cats stretch, sleep, play with yarn, and explore windows, gardens, and climbing towers. Find smooth coats, fluffy fur, outlined patches, and varied rooms and outdoor settings.","dogs":"Puppies and dogs play with balls, rest in beds, and explore gardens, bridges, and mountain cabins. Floppy ears, curly coats, short legs, and shaggy fur give the collection a range of distinct silhouettes.","cars":"Hatchbacks, sedans, sports cars, pickups, and camper-style vehicles appear on open roads and in detailed streets and garages. Imaginative vehicle concepts are identified as concepts in their individual titles.","unicorns":"Single-horned unicorns explore flower gardens, woodland paths, clouds, and imagined castles. Choose a clear character outline or a scene with patterned manes, plants, and architectural details.","spring":"New leaves, blossoms, rain puddles, nesting birds, and young animals fill these spring scenes. Garden activities, flower markets, streams, and glasshouses bring more detail to the collection.","halloween":"Pumpkins, friendly ghosts, bats, black cats, costumes, and decorated houses create playful Halloween scenes. Open character outlines sit alongside detailed lantern-lit gardens and imaginative interiors.","easter":"Decorated eggs, rabbits, chicks, baskets, and spring flowers form the Easter collection. Simple arrangements and detailed gardens offer different amounts of pattern and background to color.","valentines-day":"Hearts, roses, paired animals, gift boxes, letters, and tea sets fill these Valentine designs. Choose a simple motif or an ornate floral frame with fine decorative details.","thanksgiving":"Turkeys, pumpkins, harvest baskets, autumn leaves, and shared meal scenes make up this Thanksgiving collection. Clear single subjects and detailed kitchens, porches, and harvest arrangements offer a range of drawing detail.","roses":"Single roses, buds, tied bunches, garden arches, and formal fountain gardens highlight layered petals and serrated leaves.","sunflowers":"Large sunflower heads, broad leaves, tied bouquets, cottage entrances, and covered garden seats offer bold flower shapes and varied backgrounds.","bouquets":"Tied stems, wrapped flowers, patterned vases, and flower-arranging tables bring together blossoms of different shapes and sizes.","garden-flowers":"Tulips, daisies, lilies, orchids, and other garden blossoms appear in pots, flower beds, woodland patches, and conservatories.","floral-mandalas":"Layered petals, leaves, tulip shapes, and botanical curls repeat around a central flower in broad or finely patterned rings.","geometric-mandalas":"Stars, diamonds, angular petals, lattice bands, and celestial motifs form circular patterns with clearly repeated sections.","animal-mandalas":"Butterflies, fish, feather-eye motifs, shells, and starfish repeat among flowers and flowing shapes in circular ornamental designs.","fantasy":"Unicorns, dragons, and storybook princesses explore gardens, castles, woodland paths, and imagined floating worlds. Simple character outlines and detailed scenes offer different ways to invent a palette.","holidays":"Pumpkins and friendly ghosts, Easter eggs and rabbits, harvest turkeys, Valentine hearts, and winter decorations mark different celebrations. Browse a holiday theme for simple motifs and detailed seasonal scenes.","vehicles":"Cars, camper vans, bicycles, boats, and other vehicles appear in roads, workshops, gardens, and imagined adventures. Explore each vehicle theme for clear outlines and scenes with more background detail.","sharks":"Hammerheads, spotted whale sharks, long-tailed threshers, and other sharks explore reefs, kelp forests, and mangrove channels. Simple profiles and richly detailed underwater scenes show different silhouettes and fin shapes.","sea-turtles":"Sea turtles hatch on sandy shores and glide among coral, kelp, mangrove roots, and reef fish. Explore expressive hatchlings, patterned flippers, and detailed underwater habitats.","birthdays":"Happy Birthday lettering tops cakes, gifts, playful animals, family celebrations, and imagined party settings. Open outlines and elaborate tea tables, gardens, bakeries, and fantasy scenes offer varied coloring detail."};
for(const category of COLORING_TAXONOMY){const intro=reviewedCatalogIntros[category.id];if(intro)category.intro=intro;}
export const ROOT_CATEGORIES=COLORING_TAXONOMY.filter(c=>!c.parent);
export const VISION_ROOT_CATEGORIES=ROOT_CATEGORIES.filter(c=>!c.editorial_only);
const byId=new Map(COLORING_TAXONOMY.map(c=>[c.id,c]));
export function categoryById(id:string){return byId.get(id);}
export function childCategories(id:string){return COLORING_TAXONOMY.filter(c=>c.parent===id);}
export function visionChildCategories(id:string){return childCategories(id).filter(c=>!c.editorial_only);}
export function categoryPath(id:string){const c=byId.get(id);return c?`/coloring-pages/${c.parent?c.parent+'/':''}${c.id}/`:'/coloring-pages/';}
export function categoryLineage(id:string):string[]{const c=byId.get(id);return c?[...(c.parent?[c.parent]:[]),c.id]:[];}
// Reject ambiguous aliases rather than silently mapping one word to two collections.
const aliases=new Map<string,Set<string>>();
for(const c of COLORING_TAXONOMY)for(const raw of [c.id,c.name,...c.aliases]){const key=raw.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!aliases.has(key))aliases.set(key,new Set());aliases.get(key)!.add(c.id);}
export function resolveCategoryAlias(value:string){const direct=value.toLowerCase().trim();if(byId.has(direct))return direct;const values=aliases.get(value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());return values?.size===1?[...values][0]:undefined;}

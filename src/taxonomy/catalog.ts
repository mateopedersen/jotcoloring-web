/** Stable, curated taxonomy. Adding a topic here does not fabricate catalog items. */
export const TAXONOMY_VERSION='jot-taxonomy-2.0.0';
export interface ColoringCategory {id:string;name:string;topic:string;parent:string|null;visual:string;icon:string;sample:string;intro:string;aliases:string[]}
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
export const COLORING_TAXONOMY:readonly ColoringCategory[]=[...top,...children.trim().split('\n').map(row=>{const [id,name,parent,visual,aliases]=row.trim().split('|'),root=top.find(x=>x.id===parent)!;return{id,name,topic:name,parent,visual,icon:subjectIcons.has(id)?id:root.icon,sample:samples[id]||'',intro:`Explore ${name.toLowerCase()} coloring pages. Choose a PDF or image to print, or add your own colors in Studio.`,aliases:aliases.split(',')} as ColoringCategory})];
export const ROOT_CATEGORIES=COLORING_TAXONOMY.filter(c=>!c.parent);
const byId=new Map(COLORING_TAXONOMY.map(c=>[c.id,c]));
export function categoryById(id:string){return byId.get(id);}
export function childCategories(id:string){return COLORING_TAXONOMY.filter(c=>c.parent===id);}
export function categoryPath(id:string){const c=byId.get(id);return c?`/coloring-pages/${c.parent?c.parent+'/':''}${c.id}/`:'/coloring-pages/';}
export function categoryLineage(id:string):string[]{const c=byId.get(id);return c?[...(c.parent?[c.parent]:[]),c.id]:[];}
// Reject ambiguous aliases rather than silently mapping one word to two collections.
const aliases=new Map<string,Set<string>>();
for(const c of COLORING_TAXONOMY)for(const raw of [c.id,c.name,...c.aliases]){const key=raw.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();if(!aliases.has(key))aliases.set(key,new Set());aliases.get(key)!.add(c.id);}
export function resolveCategoryAlias(value:string){const direct=value.toLowerCase().trim();if(byId.has(direct))return direct;const values=aliases.get(value.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());return values?.size===1?[...values][0]:undefined;}

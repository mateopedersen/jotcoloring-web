/** Reviewed numeral topics; package labels never establish age or difficulty. */
export const NUMBER_VALUES=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,99,100,101,111,222,333,444,555,666,777,888,999,1000,1001,2222] as const;
export const numberTopic=(value:string|number)=>/^[1-9]\d{0,8}$/.test(String(value))&&(NUMBER_VALUES as readonly number[]).includes(Number(value))?{number:Number(value),id:'number-'+value,name:'Number '+value,path:'/coloring-pages/numbers/'+value+'/'}:undefined;
export const NUMBER_INTROS:Record<number,string>={
 1:'An outlined number 1 joins a pond-side turtle, a raccoon baker, and other illustrated scenes. Geometric versions divide the digit into curved and straight-sided sections.',
 2:'Penguins, a gem-patterned digit beneath a castle arch, and sectioned outlines explore the number 2. Counting scenes and decorative versions give the curved numeral different settings.',
 3:'A lamb in an apple orchard and a bear with a snowflake-patterned digit are among these number 3 scenes. Other designs divide its rounded outline into curved and angular spaces.',
 4:'A dinosaur in a prehistoric landscape and an elephant with ice cream cones accompany number 4. The collection also includes geometric sections inside the numeral.',
 5:'Lunch boxes, a ladybug at a garden entrance, and books bring counting details to number 5. Decorative versions fill the digit with rounded arcs and irregular sections.',
 6:'Socks, toy airplanes, and a squirrel appear in scenes built around number 6. Curved and angular divisions turn its looped outline into decorative coloring spaces.',
 7:'Buttons, clocks, a dog, and a pond setting accompany number 7. Other drawings explore the angular digit through curved and straight-sided geometric sections.',
 8:'Bows, kites, and a pond-side turtle are among the counting details beside number 8. Sectioned versions offer decorative shapes within its two rounded loops.',
 9:'Ice cream cones, pears, and a puffin beside a seaside cave appear with number 9. Geometric designs divide its loop and stem into smaller outlined spaces.',
 10:'Kites, folding fans, and an orchard scene with a lamb explore number 10. The paired digits also appear with curved and angular sections to color.',
 11:'Toy airplanes, backpacks, and a dinosaur beside a cave accompany number 11. Decorative designs break the repeated digits into varied geometric sections.',
 12:'Alarm clocks, paint palettes, and an astronaut at an imagined space cave appear with number 12. Other pages use sectioned outlines within both digits.',
 13:'Kites and ducklings appear in counting scenes around number 13, including a robot character. Geometric versions add curved and angular sections inside the digits.',
 14:'Pears, snow globes, and a rabbit at a musical stage accompany number 14. The numeral pair also appears in sectioned decorative designs.',
 15:'Folding fans and an otter on a dock with watering cans are among these number 15 scenes. Curved and angular patterns provide another way to explore the two digits.',
 99:'Rounded number 99 outlines sit alongside imagined stone formations, including a waterfall between two nines. Ornamental arithmetic displays add equations and decorative details.',
 100:'Explore number 100 through clear digit outlines, a dinosaur museum scene, and floral arithmetic displays. Some drawings arrange ten groups of ten around the number.',
 101:'Bold outlined digits and crystalline cave formations give number 101 different shapes and settings. Place-value designs show how hundreds, tens, and ones form the number.',
 111:'Rounded number 111 outlines appear alongside an apple tree and ladder and other illustrated scenes. Place-value displays show 100 + 10 + 1 within decorative compositions.',
 222:'Broad number 222 outlines share the collection with an imagined floating island and wind turbine. Place-value drawings arrange hundreds, tens, and ones around the repeated digits.',
 333:'Rounded number 333 outlines join an underwater bookshelf with a sea turtle and other imaginative settings. Basket arrangements illustrate three groups of 111.',
 444:'Explore number 444 in rounded outlines, an owl library lift, and a place-value building. Architectural and decorative details surround the repeated fours.',
 555:'Broad outlined fives appear with a parcel-filled house and other illustrated settings. Place-value charts show 500 + 50 + 5 among decorative number designs.',
 666:'Rounded number 666 outlines join scenes such as a fox with a wheelbarrow. An imagined castle displays addition and subtraction facts around the repeated digits.',
 777:'Number 777 appears in rounded outlines and beneath a harp-shaped structure. Other compositions arrange its hundreds, tens, and ones in decorative place-value displays.',
 888:'Rounded number 888 outlines join a reading scene with a child and bookcase. An imagined castle presents an arithmetic design using 888 and 900.',
 999:'Explore number 999 through rounded digit outlines, a skateboard park, and decorative place-value displays. Equations and scene details give the repeated nines different contexts.',
 1000:'Number 1000 appears in rounded outlines, a pelican mailbox scene, and an owl arithmetic display. Four-digit compositions range from broad shapes to illustrated settings.',
 1001:'Rounded number 1001 outlines join a painting chameleon and a garden number path. Addition and subtraction designs explore the relationship between 1000 and 1001.',
 2222:'Rounded number 2222 outlines appear with a telescope scene and a penguin number path. Addition and subtraction by two accompany some of the four-digit designs.'
};
/** Exact numeric subject: title prefix or a single unambiguous reviewed tag. */
export function canonicalNumberSubject(alias='c'){
 const full=`(' '||lower(replace(${alias}.title,'-',' ')))`,position=`instr(${full},' number ')`,tail=`substr(${full},${position}+8)`,token=`substr(${tail},1,instr(${tail}||' ',' ')-1)`;
 return `CASE WHEN ${position}>0 AND ${token} GLOB '[0-9]*' AND ${token} NOT GLOB '*[^0-9]*' THEN ${token} WHEN (SELECT COUNT(*) FROM content_tag nt WHERE nt.content_id=${alias}.id AND nt.tag GLOB '[0-9]*' AND nt.tag NOT GLOB '*[^0-9]*')=1 THEN (SELECT nt.tag FROM content_tag nt WHERE nt.content_id=${alias}.id AND nt.tag GLOB '[0-9]*' AND nt.tag NOT GLOB '*[^0-9]*' LIMIT 1) END`;
}
export function searchNumberSubject(){
 const full="(' '||lower(replace(d.title,'-',' ')))",position=`instr(${full},' number ')`,tail=`substr(${full},${position}+8)`,token=`substr(${tail},1,instr(${tail}||' ',' ')-1)`,tags="json_each('['||replace(json_quote(trim(d.tags)),' ','\",\"')||']')",numeric="value GLOB '[0-9]*' AND value NOT GLOB '*[^0-9]*'";
 return `CASE WHEN ${position}>0 AND ${token} GLOB '[0-9]*' AND ${token} NOT GLOB '*[^0-9]*' THEN ${token} WHEN (SELECT COUNT(*) FROM ${tags} WHERE ${numeric})=1 THEN (SELECT value FROM ${tags} WHERE ${numeric} LIMIT 1) END`;
}
export function numberTopicForArt(item:{title:string;tags?:string[];category_ids?:string[]}){
 if(!item.category_ids?.includes('numbers'))return;
 const literal=item.title.toLowerCase().replaceAll('-',' ').match(/\bnumber\s+([1-9]\d*)(?=\s|$)/),tags=(item.tags||[]).filter(t=>/^[0-9]+$/.test(t));
 return numberTopic(literal?.[1]||(tags.length===1?tags[0]:''));
}

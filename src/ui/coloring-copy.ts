import type {Content} from '../server/types';

/** Display labels only. Accepted source titles, reviews and search identity stay intact. */
export function coloringPageTitle(title:string){
 const label=title.trim().replace(/\s+coloring\s+pages?\s*[.!]?$/i,'').replace(/[.!]+$/,'');
 return /\bcoloring\s+pages?\b/i.test(label)?label:`${label} Coloring Page`;
}

const suggestions:[RegExp,string][]=[
 [/\b(?:kitten|cat)\b.*\byarn\b|\byarn\b.*\b(?:kitten|cat)\b/i,'Try a soft coat color, then pick a contrasting shade for the yarn.'],
 [/\b(?:petal|petals|blossom|blossoms|flower|flowers)\b/i,'Try related shades on the petals, with one brighter color as an accent.'],
 [/\b(?:coral|reef|kelp|underwater|sea turtle|shark|dolphin)\b/i,'Begin with gentle blues for the water and use a contrasting shade for the main subject.'],
 [/\b(?:snow|snowman|snowflake|snowflakes|snowy)\b/i,'Leave some of the paper white for snow and bring warmth to the other shapes with your favorite colors.'],
 [/\b(?:number|digit|digits|numeral|counting)\b/i,'Give the main numeral a clear color, then try a repeating palette in the surrounding shapes.'],
 [/\b(?:mandala|mandalas|repeating|paisley|geometric)\b/i,'Begin at the center and repeat a few colors as the pattern grows outward.'],
 [/\b(?:castle|palace|turret|turrets)\b/i,'Choose a color for the main walls, then give the smaller architectural details a contrasting finish.'],
 [/\b(?:car|cars|truck|trucks|sedan|vehicle|vehicles|camper)\b/i,'Choose a main body color first, then use a quieter shade for the smaller details.'],
 [/\b(?:cake|cakes|cupcake|cupcakes|icing|cookie|cookies)\b/i,'Pick a cheerful color for the treat and give the decorations their own accent shades.'],
 [/\b(?:hair|dress|outfit|clothes|clothing)\b/i,'Choose the main figure colors before adding smaller accents and background shades.'],
 [/\b(?:bird|owl|feather|feathers|wing|wings)\b/i,'Try related shades across the larger shapes, with a brighter accent in the smallest details.'],
 [/\b(?:tree|trees|forest|woodland|bamboo)\b/i,'Layer a few greens through the scene and try a warm shade beside them for contrast.'],
 [/\b(?:robot|robots|rocket|spacecraft)\b/i,'Pair a cool main color with one bright accent, then work through the smallest sections.'],
 [/\b(?:heart|hearts|gift|gifts|balloon|balloons)\b/i,'Choose a favorite accent color and repeat it in a few small places to tie the page together.'],
 [/\b(?:book|books|library|bookcase|bookshelf)\b/i,'Try a different color on neighboring sections and repeat a favorite shade to bring the scene together.']
];
const finishing=[
 'Work from the larger spaces toward the finer details.',
 'Test your palette in one small area before filling the rest.',
 'A few light areas can help your brightest colors stand out.',
 'Keep one favorite shade as a small accent across the page.',
 'Take your time with the small spaces and enjoy the larger ones.',
 'Start lightly so you can add deeper color where you want it.'
];

/** A creative suggestion, not another claim of visual review or canonical colors.
 * Only the current accepted description selects a subject-specific action. No
 * cached invitation can survive a source/metadata replacement.
 */
export function coloringInvitation(item:Pick<Content,'title'|'description'>){
 const subject=item.title.trim().replace(/\s+coloring\s+pages?\s*[.!]?$/i,'').replace(/[.!]+$/,'').replace(/[-–—]/g,' ');
 const source=item.description||'';
 const action=suggestions.find(([pattern])=>pattern.test(source))?.[1]||'Choose a few colors you enjoy and start with the largest outlined space.';
 const key=Array.from(subject).reduce((total,c)=>(total*31+c.charCodeAt(0))>>>0,0);
 return `Make “${subject}” your own. ${action} ${finishing[key%finishing.length]}`;
}

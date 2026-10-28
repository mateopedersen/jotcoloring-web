/** Original, code-authored coloring vectors. 25 base drawings × 20 ornament variants.
 * These are 500 insertable variations, not 500 different subjects. All paths are
 * static native geometry; no remote SVG, markup, fonts, or scripts are accepted.
 * Repeated semantic IDs intentionally bind parts such as both ears to one color.
 */
export interface LibraryRegion { id: string; label: string; path: string; fill?: string }
export interface LibraryObject {
  id: string; baseId: string; variantId: string; title: string; category: string;
  width: number; height: number; regions: LibraryRegion[]; outlinePaths?: string[];
}
interface BaseDrawing { id: string; title: string; category: string; regions: LibraryRegion[]; outlinePaths?: string[]; decoration: [number, number, number, number] }
const n = (value: number) => String(Math.round(value * 100) / 100);
const poly = (points: number[][]) => `M${points.map(p => p.map(n).join(' ')).join(' L')} Z`;
const ellipse = (x: number, y: number, rx: number, ry = rx) => `M${n(x-rx)} ${n(y)} A${n(rx)} ${n(ry)} 0 1 0 ${n(x+rx)} ${n(y)} A${n(rx)} ${n(ry)} 0 1 0 ${n(x-rx)} ${n(y)} Z`;
const box = (x: number, y: number, w: number, h: number, r = 5) => `M${x+r} ${y} H${x+w-r} Q${x+w} ${y} ${x+w} ${y+r} V${y+h-r} Q${x+w} ${y+h} ${x+w-r} ${y+h} H${x+r} Q${x} ${y+h} ${x} ${y+h-r} V${y+r} Q${x} ${y} ${x+r} ${y} Z`;
const region = (id: string, label: string, path: string, fill?: string): LibraryRegion => ({ id, label, path, ...(fill ? { fill } : {}) });
const eye = (x: number, y: number, radius = 3) => region('eyes', 'Both eyes', ellipse(x,y,radius), '#171717');
const paws = (y: number, left = 99, right = 157) => [region('paws','Both paws',ellipse(left,y,24,13)),region('paws','Both paws',ellipse(right,y,24,13))];
const earPair = (left: string, right: string) => [region('ears','Both ears',left),region('ears','Both ears',right)];
const innerEarPair = (left: string, right: string) => [region('inner-ears','Inside both ears',left),region('inner-ears','Inside both ears',right)];
const animal = (id: string, title: string, regions: LibraryRegion[], decoration: BaseDrawing['decoration'], outlinePaths: string[] = []): BaseDrawing => ({id,title,category:'Animals',regions,decoration,outlinePaths});
const pot = () => [region('pot', 'Plant pot',poly([[78,171],[178,171],[164,233],[92,233]])),region('pot-rim','Pot rim',box(73,162,110,19,5))];
const leaf = (x: number,y: number, side: number) => `M${x} ${y} Q${x+side*50} ${y-48} ${x+side*57} ${y-11} Q${x+side*28} ${y+17} ${x} ${y} Z`;
const stem = (top = 73) => region('stem','Stem',box(123,top,10,100));
const plant = (id:string,title:string,regions:LibraryRegion[],outlinePaths:string[]=[]):BaseDrawing => ({id,title,category:'Flowers & plants',regions:[...regions,...pot()],outlinePaths,decoration:[128,207,50,29]});
const wheels = (left: number,right: number,y=194) => [region('tires','Both tires',ellipse(left,y,23)),region('tires','Both tires',ellipse(right,y,23)),region('hubs','Both wheel centers',ellipse(left,y,11)),region('hubs','Both wheel centers',ellipse(right,y,11))];
const vehicle = (id:string,title:string,regions:LibraryRegion[],decoration:BaseDrawing['decoration'],outlinePaths:string[]=[]):BaseDrawing => ({id,title,category:'Vehicles',regions,decoration,outlinePaths});
const BASES: BaseDrawing[] = [
  animal('cat','Sitting kitten',[
    region('tail','Curled tail','M169 178 C222 147 230 204 200 215 C178 226 157 208 166 195 C178 204 193 206 199 195 C207 181 186 181 176 195 Z'),
    region('body','Body',ellipse(128,174,52,56)),
    ...earPair(poly([[64,94],[63,32],[109,64]]),poly([[147,64],[193,32],[192,94]])),
    region('head','Head',ellipse(128,94,69,51)),
    ...innerEarPair(poly([[72,72],[72,48],[91,65]]),poly([[165,65],[184,48],[184,72]])),
    region('belly','Belly',ellipse(128,180,32,37)),...paws(220),eye(102,92),eye(154,92),
    region('nose','Nose',poly([[119,105],[137,105],[128,114]]))
  ],[128,180,38,43],['M128 114 Q119 127 110 116 M128 114 Q137 127 146 116','M88 106 L43 99 M87 115 L43 118 M168 106 L213 99 M169 115 L213 118']),
  animal('puppy','Floppy-eared puppy',[
    region('tail','Tail','M166 188 Q217 147 216 177 Q206 206 166 209 Z'),region('body','Body',ellipse(128,173,53,57)),
    ...earPair('M80 59 Q44 53 41 115 Q44 143 68 132 L93 87 Z','M176 59 Q212 53 215 115 Q212 143 188 132 L163 87 Z'),
    region('head','Head',ellipse(128,92,62,55)),region('muzzle','Muzzle',ellipse(128,117,32,23)),region('belly','Belly',ellipse(128,183,33,36)),
    region('collar','Collar',box(82,141,92,13,6)),region('tag','Collar tag',ellipse(128,158,8)),...paws(221),eye(103,89),eye(153,89),region('nose','Nose',ellipse(128,108,10,7),'#171717')
  ],[128,187,38,36],['M128 115 V125 M116 126 Q128 137 140 126']),
  animal('fox','Woodland fox',[
    region('tail','Bushy tail','M164 186 Q198 135 229 126 Q237 196 181 222 L157 205 Z'),region('tail-tip','Tail tip','M229 126 Q233 154 221 179 L202 174 L199 156 Z'),region('body','Body',ellipse(128,178,48,53)),
    ...earPair(poly([[66,87],[64,26],[110,65]]),poly([[146,65],[192,26],[190,87]])),
    region('head','Head','M64 76 Q128 45 192 76 Q188 119 128 148 Q68 119 64 76 Z'),
    ...innerEarPair(poly([[74,67],[73,43],[94,63]]),poly([[162,63],[183,43],[182,67]])),
    region('cheeks','Both cheeks','M64 91 Q90 114 128 127 Q104 136 128 148 Q75 123 64 91 Z'),region('cheeks','Both cheeks','M192 91 Q166 114 128 127 Q152 136 128 148 Q181 123 192 91 Z'),
    region('chest','Chest',poly([[103,149],[128,162],[153,149],[157,197],[128,214],[99,197]])),...paws(221),eye(99,94),eye(157,94),region('nose','Nose',poly([[118,122],[138,122],[128,134]]),'#171717')
  ],[128,187,35,29]),
  animal('rabbit','Long-eared rabbit',[
    region('tail','Fluffy tail',ellipse(177,190,23)),region('body','Body',ellipse(128,178,50,54)),
    ...earPair('M80 84 C52 9 93 0 114 80 Z','M142 80 C163 0 204 9 176 84 Z'),
    ...innerEarPair('M88 72 C73 24 91 23 103 74 Z','M153 74 C165 23 183 24 168 72 Z'),
    region('head','Head',ellipse(128,109,57,46)),region('belly','Belly',ellipse(128,183,31,37)),...paws(221,96,160),eye(105,102),eye(151,102),region('nose','Nose',poly([[120,116],[136,116],[128,124]]))
  ],[128,185,36,40],['M128 124 V130 M117 130 Q128 140 139 130','M91 119 L60 113 M92 126 L58 129 M165 119 L196 113 M164 126 L198 129']),
  animal('bear','Teddy bear',[
    region('body','Body',ellipse(128,177,59,58)),...earPair(ellipse(77,59,25),ellipse(179,59,25)),
    ...innerEarPair(ellipse(77,59,13),ellipse(179,59,13)),region('head','Head',ellipse(128,96,67,57)),
    region('muzzle','Muzzle',ellipse(128,119,30,22)),region('belly','Belly',ellipse(128,181,37,37)),
    region('arms','Both arms',ellipse(69,173,19,34)),region('arms','Both arms',ellipse(187,173,19,34)),...paws(224,87,169),eye(103,92),eye(153,92),region('nose','Nose',ellipse(128,112,10,7),'#171717')
  ],[128,181,45,42],['M128 119 V129 M117 129 Q128 139 139 129']),
  animal('owl','Woodland owl',[
    region('feet','Both feet',poly([[88,216],[107,216],[113,238],[95,232],[80,236]])),region('feet','Both feet',poly([[149,216],[168,216],[176,236],[161,232],[143,238]])),
    region('body','Body','M58 64 L55 25 L98 47 Q128 36 158 47 L201 25 L198 64 Q227 129 198 193 Q184 224 128 228 Q72 224 58 193 Q29 129 58 64 Z'),
    region('wings','Both wings','M59 107 Q36 159 69 202 Q102 168 88 122 Z'),region('wings','Both wings','M197 107 Q220 159 187 202 Q154 168 168 122 Z'),
    region('face','Face',ellipse(94,91,39,40)),region('face','Face',ellipse(162,91,39,40)),region('belly','Belly',ellipse(128,170,38,46)),eye(94,88,8),eye(162,88,8),region('beak','Beak',poly([[116,113],[140,113],[128,131]]))
  ],[128,173,40,49]),
  animal('fish','Tropical fish',[
    region('tail','Tail fin','M192 114 L240 74 L230 128 L240 182 L192 142 Z'),region('top-fin','Top fin','M86 82 Q121 29 165 77 L144 100 Z'),region('bottom-fin','Bottom fin','M90 170 Q125 223 168 172 L145 151 Z'),
    region('body','Body','M20 128 Q67 51 156 76 Q199 88 207 128 Q199 168 156 180 Q67 205 20 128 Z'),
    region('face','Face','M20 128 Q39 95 69 83 Q91 130 69 173 Q39 160 20 128 Z'),region('side-fin','Side fin','M133 124 L97 108 Q90 128 97 148 Z'),eye(52,115,5)
  ],[169,128,33,50],['M28 135 Q40 145 49 137','M215 104 L224 91 M216 128 L230 128 M215 152 L224 165']),
  animal('turtle','Garden turtle',[
    region('legs','All four legs',ellipse(80,173,25,33)),region('legs','All four legs',ellipse(166,173,25,33)),region('legs','All four legs',ellipse(78,87,23,26)),region('legs','All four legs',ellipse(166,87,23,26)),
    region('tail','Tail',poly([[64,120],[24,130],[64,143]])),region('head','Head',ellipse(208,130,32,30)),region('shell','Shell',ellipse(120,130,82,75)),region('shell-center','Center shell',poly([[100,83],[140,83],[164,130],[140,177],[100,177],[76,130]])),eye(217,120,4)
  ],[120,130,43,57],['M100 83 L80 66 M140 83 L160 66 M164 130 L201 130 M140 177 L161 193 M100 177 L80 193 M76 130 L39 130','M218 143 Q229 147 235 137']),
  animal('butterfly','Garden butterfly',[
    region('upper-wings','Both upper wings','M124 116 C81 20 4 24 21 89 C27 125 63 146 121 143 Z'),region('upper-wings','Both upper wings','M132 116 C175 20 252 24 235 89 C229 125 193 146 135 143 Z'),
    region('lower-wings','Both lower wings','M121 136 C43 122 24 169 56 207 C83 239 113 191 124 161 Z'),region('lower-wings','Both lower wings','M135 136 C213 122 232 169 200 207 C173 239 143 191 132 161 Z'),
    region('wing-spots','Both wing spots',ellipse(67,90,25,20)),region('wing-spots','Both wing spots',ellipse(189,90,25,20)),region('wing-spots','Both wing spots',ellipse(79,174,18,20)),region('wing-spots','Both wing spots',ellipse(177,174,18,20)),
    region('body','Body',ellipse(128,137,13,57)),region('head','Head',ellipse(128,78,16)),eye(122,76,2),eye(134,76,2)
  ],[67,90,26,22],['M120 66 Q93 29 103 23 M136 66 Q163 29 153 23']),
  animal('bird','Songbird',[
    region('tail','Tail feathers','M90 151 L18 125 L30 157 L16 172 L92 184 Z'),region('feet','Both feet',poly([[109,204],[115,204],[117,231],[97,231],[114,222]])),region('feet','Both feet',poly([[149,204],[155,204],[155,224],[172,231],[150,231]])),
    region('body','Body',ellipse(132,154,67,57)),region('head','Head',ellipse(176,91,43,42)),region('beak','Beak',poly([[210,87],[242,100],[210,112]])),
    region('wing','Wing','M133 126 Q77 124 76 161 Q91 193 142 184 Q169 170 162 145 Z'),region('breast','Breast','M180 123 Q221 143 184 191 Q172 205 153 208 Q179 163 180 123 Z'),eye(189,84,5)
  ],[124,156,47,34],['M160 53 Q144 34 153 24 Q168 29 173 50 M172 50 Q174 27 187 25 Q194 38 186 52']),
  plant('daisy','Potted daisy',[
    stem(70),region('leaves','Both leaves',leaf(125,132,-1)),region('leaves','Both leaves',leaf(131,143,1)),
    ...Array.from({length:10},(_,i)=>{const a=i*Math.PI/5,x=128+Math.cos(a)*36,y=72+Math.sin(a)*36;return region('petals','All petals',ellipse(x,y,19,22));}),region('flower-center','Flower center',ellipse(128,72,24))
  ]),
  plant('tulip','Potted tulip',[
    stem(78),region('leaves','Both leaves','M123 159 Q68 146 66 96 Q117 114 123 159 Z'),region('leaves','Both leaves','M133 159 Q188 146 190 96 Q139 114 133 159 Z'),
    region('outer-petals','Outer petals','M70 40 L106 65 L128 28 L150 65 L186 40 Q187 119 128 123 Q69 119 70 40 Z'),region('center-petal','Center petal','M106 65 L128 28 L150 65 Q155 105 128 123 Q101 105 106 65 Z')
  ]),
  plant('rose','Potted rose',[
    stem(78),region('leaves','Both leaves',leaf(125,134,-1)),region('leaves','Both leaves',leaf(131,145,1)),region('rose','Outer rose','M86 42 Q94 17 122 28 Q150 13 167 37 Q196 40 187 68 Q201 94 174 106 Q164 129 137 116 Q111 132 94 111 Q66 108 74 80 Q58 57 86 42 Z'),
    region('middle-petals','Middle petals','M89 60 Q106 36 129 45 Q161 34 171 65 Q184 83 158 99 Q136 116 112 99 Q81 98 89 60 Z'),region('inner-petals','Inner petals','M108 62 Q130 47 151 63 Q170 84 144 93 Q119 106 105 85 Z'),region('rose-heart','Rose heart','M117 69 Q135 59 145 73 Q149 88 129 85 Q118 86 117 69 Z')
  ]),
  plant('sunflower','Potted sunflower',[
    stem(75),region('leaves','Both leaves',leaf(125,135,-1)),region('leaves','Both leaves',leaf(131,142,1)),
    ...Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,ca=Math.cos(a),sa=Math.sin(a);return region('petals','All petals',poly([[128+ca*22-sa*10,72+sa*22+ca*10],[128+ca*58,72+sa*58],[128+ca*22+sa*10,72+sa*22-ca*10]]));}),region('flower-center','Sunflower center',ellipse(128,72,28))
  ],['M110 61 L146 83 M110 72 L140 91 M119 51 L150 72 M146 61 L110 83 M146 72 L116 91 M137 51 L106 72']),
  plant('cactus','Flowering cactus',[
    region('branches','Both branches','M99 130 H72 Q48 130 48 106 V81 Q48 60 66 60 Q82 60 82 81 V100 H104 Z'),region('branches','Both branches','M153 115 H180 V83 Q180 67 197 67 Q214 67 214 83 V122 Q214 143 192 143 H153 Z'),
    region('cactus','Main cactus','M99 171 V62 Q99 29 128 29 Q157 29 157 62 V171 Z'),region('flower','Flower','M112 39 Q96 20 115 13 Q129 2 138 16 Q158 15 152 31 Q155 45 137 44 Q121 54 112 39 Z'),region('flower-center','Flower center',ellipse(132,29,8))
  ],['M115 62 V151 M140 62 V151 M63 82 V111 M196 88 V125','M104 76 L94 72 M151 90 L163 84 M103 126 L92 121 M151 147 L163 141']),
  vehicle('car','Friendly compact car',[
    ...wheels(69,185),region('body','Car body','M27 177 V143 Q28 124 50 124 L78 80 Q87 68 108 68 H152 Q171 68 183 87 L209 125 Q230 127 230 148 V177 Z'),
    region('windows','Both windows','M82 88 Q87 80 100 80 H123 V123 H59 Z'),region('windows','Both windows','M134 80 H151 Q163 80 173 94 L193 123 H134 Z'),region('bumper','Bumper',box(20,171,216,14,5)),region('headlights','Both lights',box(29,139,25,14,4)),region('headlights','Both lights',box(203,139,23,14,4))
  ],[128,148,77,25],['M128 128 V171 M115 134 H121 M139 134 H146']),
  vehicle('camper','Weekend camper van',[
    ...wheels(64,193),region('body','Camper body','M26 176 V79 Q26 58 49 58 H174 Q197 58 206 83 L228 129 V177 Z'),region('roof','Pop-top roof','M51 57 L67 31 H165 L181 57 Z'),
    region('windows','Cabin windows',box(39,78,48,41)),region('windows','Cabin windows',box(99,78,48,41)),region('windshield','Windshield','M161 78 H181 Q189 78 194 90 L207 119 H161 Z'),region('bumper','Bumper',box(20,173,216,14)),region('headlight','Headlight',box(210,135,15,15,4))
  ],[119,148,102,27],['M153 125 V173 M164 135 H174']),
  vehicle('train','Storybook locomotive',[
    region('smoke','Steam cloud','M73 52 Q48 50 50 31 Q48 14 68 15 Q82 3 97 18 Q118 14 119 32 Q122 51 100 51 Z'),
    region('chimney','Chimney',poly([[57,98],[57,62],[49,62],[49,50],[91,50],[91,62],[83,62],[83,98]])),
    region('boiler','Boiler',box(28,94,126,78,20)),region('cab','Driver cabin',box(149,65,75,107,4)),region('roof','Cabin roof',box(141,55,91,16,5)),region('window','Cabin window',box(165,82,43,40,4)),
    region('front','Front buffer',poly([[28,149],[12,183],[39,183],[47,170]])),region('platform','Platform',box(24,168,210,15,3)),...wheels(65,185,193),region('small-wheel','Middle wheel',ellipse(125,197,18)),region('small-hub','Middle hub',ellipse(125,197,7))
  ],[91,133,69,39],['M61 193 H188']),
  vehicle('sailboat','Little sailboat',[
    region('mast','Mast',box(124,28,8,160,2)),region('left-sail','Large sail',poly([[119,37],[119,164],[32,164]])),region('right-sail','Small sail',poly([[138,66],[216,164],[138,164]])),
    region('flag','Flag',poly([[132,28],[178,39],[132,51]])),region('hull','Boat hull','M25 179 H231 L202 218 H65 Z'),region('hull-stripe','Hull stripe',poly([[34,191],[221,191],[213,202],[47,202]]))
  ],[90,130,35,40],['M28 232 Q48 221 68 232 Q88 243 108 232 Q128 221 148 232 Q168 243 188 232 Q208 221 228 232']),
  vehicle('airplane','Cloud explorer airplane',[
    region('wings','Both wings',poly([[109,111],[24,162],[24,186],[114,155]])),region('wings','Both wings',poly([[147,111],[232,162],[232,186],[142,155]])),
    region('tail-wings','Both tail wings',poly([[114,191],[76,220],[76,235],[120,221]])),region('tail-wings','Both tail wings',poly([[142,191],[180,220],[180,235],[136,221]])),
    region('fuselage','Fuselage','M110 72 Q111 18 128 14 Q145 18 146 72 L138 214 Q128 238 118 214 Z'),region('cockpit','Cockpit','M114 67 Q128 53 142 67 L141 88 Q128 78 115 88 Z'),region('nose','Nose tip','M118 29 Q128 1 138 29 L140 43 H116 Z')
  ],[128,134,18,57],['M50 160 L92 144 M206 160 L164 144']),
  {id:'rocket',title:'Adventure rocket',category:'Space',decoration:[128,151,44,47],regions:[
    region('fins','Both fins','M95 137 Q49 161 54 216 L97 194 Z'),region('fins','Both fins','M161 137 Q207 161 202 216 L159 194 Z'),region('flame','Rocket flame','M103 196 Q89 217 108 239 L119 227 L128 248 L138 228 L150 240 Q166 217 153 196 Z'),
    region('body','Rocket body','M94 92 Q99 44 128 17 Q157 44 162 92 V196 H94 Z'),region('nose','Nose cone','M97 76 Q106 43 128 17 Q150 43 159 76 Z'),region('window-rim','Window rim',ellipse(128,107,24)),region('window','Window',ellipse(128,107,15)),region('base','Base band',box(91,184,74,15,3))
  ]},
  {id:'planet',title:'Ringed planet',category:'Space',decoration:[128,105,58,49],regions:[
    region('ring-back','Back of ring','M31 146 C-8 106 75 69 174 70 C252 70 273 113 220 157 L195 143 C240 110 214 91 166 94 C93 88 31 112 51 134 Z'),
    region('planet','Planet',ellipse(128,126,79)),region('ring-front','Front of ring','M32 121 C51 165 172 172 229 122 C259 158 153 208 62 183 C21 172 10 149 32 121 Z'),region('ring-stripe','Ring stripe','M32 145 Q108 196 227 142 Q146 197 65 178 Q42 169 32 145 Z'),
    region('nearby-stars','Nearby stars',poly([[27,44],[31,54],[42,58],[31,62],[27,73],[23,62],[12,58],[23,54]])),region('nearby-stars','Nearby stars',poly([[222,202],[226,212],[237,216],[226,220],[222,231],[218,220],[207,216],[218,212]]))
  ]},
  {id:'cupcake',title:'Celebration cupcake',category:'Food',decoration:[128,188,67,35],regions:[
    region('wrapper','Cupcake wrapper',poly([[59,143],[197,143],[180,230],[76,230]])),region('icing','Swirled icing','M55 144 Q28 126 57 108 Q43 88 76 80 Q67 61 103 51 Q109 24 137 30 Q163 34 158 59 Q188 58 185 81 Q221 89 203 111 Q228 137 201 150 Z'),
    region('cherry','Cherry',ellipse(130,29,13)),region('icing-swirl','Icing swirl','M76 80 Q113 86 158 59 Q161 76 144 88 Q111 106 57 108 Q110 123 185 81 Q186 111 150 124 Q111 137 55 144 L201 150 Q221 139 203 111 Q155 149 90 139 Z')
  ],outlinePaths:['M132 16 Q132 4 142 5','M82 155 L91 218 M174 155 L166 218']},
  {id:'apple',title:'Orchard apple',category:'Food',decoration:[128,151,80,70],regions:[
    region('stem','Stem','M123 67 Q123 37 135 22 L146 28 Q132 46 134 69 Z'),region('leaf','Leaf','M137 49 Q158 11 202 33 Q190 69 148 58 Z'),region('apple','Apple','M128 74 C79 39 24 78 34 139 C44 207 84 243 127 220 C170 243 211 207 221 139 C231 78 176 39 128 74 Z')
  ],outlinePaths:['M108 74 Q128 85 148 74','M149 51 L184 35','M61 108 Q51 129 59 151']},
  {id:'ice-cream',title:'Triple-scoop ice cream',category:'Food',decoration:[128,190,30,29],regions:[
    region('cone','Cone',poly([[82,147],[174,147],[128,242]])),region('left-scoop','Left scoop','M50 123 Q43 98 63 83 Q81 68 103 81 Q121 94 113 122 Q124 142 106 155 Q94 163 83 151 Q67 169 54 155 Q42 143 50 123 Z'),
    region('right-scoop','Right scoop','M143 123 Q135 97 155 82 Q177 68 197 83 Q216 99 207 124 Q222 145 203 157 Q190 164 178 151 Q162 169 148 155 Q136 144 143 123 Z'),
    region('top-scoop','Top scoop','M87 69 Q79 42 101 26 Q127 8 153 26 Q176 42 168 69 Q186 90 166 107 Q152 118 139 103 Q128 122 114 104 Q97 117 85 104 Q68 87 87 69 Z'),region('cone-rim','Cone rim',box(81,150,94,13,4))
  ],outlinePaths:['M96 170 L142 216 M108 164 L150 206 M160 170 L114 216 M148 164 L106 206']}
];
const MOTIFS = ['Hearts', 'Stars', 'Dots', 'Diamonds', 'Flowers'] as const;
const ARRANGEMENTS = ['Single', 'Pair', 'Trio', 'Cluster'] as const;
function motifPath(motif: typeof MOTIFS[number], x: number, y: number, r: number): string {
  if (motif === 'Hearts') return `M${n(x)} ${n(y+r)} C${n(x-r*2)} ${n(y-r*.2)} ${n(x-r)} ${n(y-r*1.6)} ${n(x)} ${n(y-r*.6)} C${n(x+r)} ${n(y-r*1.6)} ${n(x+r*2)} ${n(y-r*.2)} ${n(x)} ${n(y+r)} Z`;
  if (motif === 'Dots') return ellipse(x,y,r);
  if (motif === 'Diamonds') return poly([[x,y-r],[x+r*.8,y],[x,y+r],[x-r*.8,y]]);
  if (motif === 'Stars') return poly(Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.42:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr];}));
  return Array.from({length:5},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/5;return ellipse(x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55,r*.43);}).join(' ')+' '+ellipse(x,y,r*.27);
}
function ornaments(base: BaseDrawing, motif: typeof MOTIFS[number], arrangement: number): LibraryRegion[] {
  const [x,y,w,h] = base.decoration;
  const layouts: number[][][] = [ [[0,0,1]], [[-.23,0,.65],[.23,0,.65]], [[0,-.22,.57],[-.23,.23,.57],[.23,.23,.57]], [[-.25,-.24,.48],[.25,-.24,.48],[-.25,.24,.48],[.25,.24,.48],[0,0,.42]] ];
  const size = Math.min(w,h)*.28;
  return layouts[arrangement].map(([dx,dy,scale])=>region('ornament',`${motif} pattern`,motifPath(motif,x+dx*w,y+dy*h,size*scale)));
}
export const OBJECT_CATEGORIES: string[] = ['Animals', 'Flowers & plants', 'Vehicles', 'Space', 'Food'];
export const OBJECT_LIBRARY: LibraryObject[] = BASES.flatMap(base => MOTIFS.flatMap(motif => ARRANGEMENTS.map((arrangement,index) => {
  const variantId = `${motif.toLowerCase()}-${arrangement.toLowerCase()}`;
  return { id:`${base.id}-${variantId}`,baseId:base.id,variantId,title:`${base.title} · ${motif} ${arrangement.toLowerCase()}`,category:base.category,width:256,height:256,regions:[...base.regions.map(r=>({...r})),...ornaments(base,motif,index)],outlinePaths:base.outlinePaths?.slice() };
})));
export const OBJECT_LIBRARY_DESCRIPTION = '500 insertable objects: 25 original drawings, each with 20 ornament variations. Paired parts share a color region.';
export function searchObjects(query: string, category?: string): LibraryObject[] {
  const words = query.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en').trim().split(/\s+/).filter(Boolean);
  return OBJECT_LIBRARY.filter(object => (!category || category === 'All' || object.category === category) && words.every(word=>`${object.title} ${object.category} ${object.baseId}`.toLocaleLowerCase('en').includes(word)));
}

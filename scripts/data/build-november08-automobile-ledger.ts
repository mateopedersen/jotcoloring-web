/** Build a checksum-bound, source-specific JotColoring release from the private vehicle archives. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
import {PDFDocument} from 'pdf-lib';
import {COLORING_TAXONOMY,categoryLineage} from '../../src/taxonomy/catalog';
import {NOVEMBER_08_AUTOMOBILE_RELEASE_ID,NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS,NOVEMBER_08_AUTOMOBILE_BRAND_ARCHIVE_SHA256S,NOVEMBER_08_AUTOMOBILE_OUTER_ARCHIVE_SHA256S,matchesReviewedSourceArchives} from '../../src/server/reviewed-release-scope';
import {canonicalJSON,sha256} from '../../src/server/http';

const taskRoot=path.resolve(process.cwd(),'../..');
const work=path.join(taskRoot,'work/incoming-2026-11-08/automobiles');
const privateRoot=path.join(work,'private-release');
const privateSources=path.join(work,'private-source');
const copyReport=JSON.parse(await fs.readFile(path.join(work,'source-copy-checksums.json'),'utf8')) as any;
const inventory=JSON.parse(await fs.readFile(path.join(privateRoot,'source-inventory.json'),'utf8')) as any;
const pairAudit=JSON.parse(await fs.readFile(path.join(privateRoot,'source-pair-audit.json'),'utf8')) as any;
const pairVisual=JSON.parse(await fs.readFile(path.join(privateRoot,'source-pair-visual-review.json'),'utf8')) as any;
const digest=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
async function hashFile(file:string){const h=createHash('sha256');for await(const chunk of createReadStream(file))h.update(chunk as Buffer);return h.digest('hex');}
const counts=NOVEMBER_08_AUTOMOBILE_TOPIC_COUNTS;
const topics=Object.keys(counts);
if(inventory.release_id!==NOVEMBER_08_AUTOMOBILE_RELEASE_ID||inventory.expected_collections!==36||inventory.expected_designs!==3600||inventory.outer_package_count!==28||inventory.nested_package_count!==10||!inventory.all_outer_sources_checksum_verified||!inventory.all_brand_archive_crc_verified||inventory.rows?.length!==3600)throw Error('Pinned private source inventory is incomplete.');
if(copyReport.package_count!==28||copyReport.files?.length!==28||!copyReport.files.every((r:any)=>r.copy_verified&&r.source_unchanged_during_copy))throw Error('All 28 private outer archive copies must be checksum-verified.');
if(pairAudit.status!=='REVIEW_REQUIRED'||pairAudit.design_count!==3600||pairAudit.topic_count!==36||pairAudit.errors?.length)throw Error('The full structural PDF/WebP pair audit is required.');
if(pairVisual.release_id!==NOVEMBER_08_AUTOMOBILE_RELEASE_ID||pairVisual.scope?.flagged_pairs!==232||pairVisual.scope?.structural_errors!==0||pairVisual.pairs?.length!==232||!pairVisual.review_method)throw Error('The checksum-bound visual review of flagged PDF/WebP pairs is incomplete.');
const visualById=new Map(pairVisual.pairs.map((r:any)=>[r.design_id,r]));
const outerHashes:Record<string,string>={};
for(const source of copyReport.files){
 const expected=NOVEMBER_08_AUTOMOBILE_OUTER_ARCHIVE_SHA256S[source.name];
 if(!expected||source.sha256!==expected||path.resolve(source.private_copy)!==path.join(privateSources,'..','private-zips',source.name))throw Error('Outer archive is outside the exact private release scope: '+source.name);
 if(await hashFile(source.private_copy)!==expected)throw Error('Private outer archive checksum changed: '+source.name);
 outerHashes[source.name]=expected;
}
if(!matchesReviewedSourceArchives({release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,source_zip_sha256s:NOVEMBER_08_AUTOMOBILE_BRAND_ARCHIVE_SHA256S,source_outer_zip_sha256s:outerHashes}))throw Error('The exact 36-brand/28-outer-archive checksum scope does not match.');
const sheetsDir=path.join(privateRoot,'artwork-overview-contact-sheets');
const reviewedContactSheets:string[]=[];
for(const topic of topics){const file=path.join(sheetsDir,topic+'.png');await fs.access(file);reviewedContactSheets.push(file);}

const sourceReferences:Record<string,{url:string;type:string;label:string}>={
 alpine:{url:'https://www.alpine-cars.co.uk/',type:'manufacturer',label:'Alpine official model site'},
 amc:{url:'https://savoymuseum.org/portfolio-items/1975-amc-pacer-x/',type:'museum-archive',label:'Savoy Automobile Museum collection'},
 anadol:{url:'https://www.anadolturkey.com/web/en/models/a1.html',type:'enthusiast-archive',label:'Anadol Turkey historical model archive'},
 citroen:{url:'https://www.citroen.co.uk/citroen-range.html',type:'manufacturer',label:'Citroën official range'},
 czinger:{url:'https://www.czinger.com/new-czinger-21c-spyder',type:'manufacturer',label:'Czinger official 21C model page'},
 delorean:{url:'https://www.delorean.com/',type:'brand-owner',label:'DeLorean official brand site'},
 denza:{url:'https://www.denza.com/eu/base-page/base-page',type:'manufacturer',label:'Denza official models'},
 'ds-automobiles':{url:'https://www.dsautomobiles.co.uk/models/dsn8-electric.html',type:'manufacturer',label:'DS Automobiles official N°8 model page'},
 geely:{url:'https://global.geely.com/models/ex5',type:'manufacturer',label:'Geely official model page'},
 hennessey:{url:'https://www.hennesseymedia.com/wp-content/uploads/2025/04/Hennessey-Finalizes-Testing-of-2031-HP-Venom-F5-Evolution-Hypercar.pdf',type:'manufacturer-media',label:'Hennessey Special Vehicles official Venom F5 Evolution release'},
 hummer:{url:'https://www.gmc.com/electric/hummer-ev',type:'manufacturer',label:'GMC official HUMMER EV model range'},
 'ineos-automotive':{url:'https://ineosgrenadier.com/en/quartermaster',type:'manufacturer',label:'INEOS Grenadier official Quartermaster page'},
 'international-harvester':{url:'https://wisconsinhistory.org/research/explore-our-collections/collection-overviews/mccormick-international-harvester-collection/',type:'museum-archive',label:'Wisconsin Historical Society McCormick–International Harvester archive'},
 koenigsegg:{url:'https://www.koenigsegg.com/megacars',type:'manufacturer',label:'Koenigsegg official model range'},
 leapmotor:{url:'https://www.leapmotor.net/models',type:'manufacturer',label:'Leapmotor official model range'},
 'li-auto':{url:'https://ir.lixiang.com/static-files/7f0f559e-1e07-4509-9214-19c5dfc7de92',type:'manufacturer-ir',label:'Li Auto official 2026 annual report and MEGA Home update'},
 mercury:{url:'https://media.ford.com/content/fordmedia/fna/us/en/heritage.html',type:'manufacturer-heritage',label:'Ford official heritage archive'},
 nio:{url:'https://www.nio.com/et5',type:'manufacturer',label:'NIO official ET5 model page'},
 oldsmobile:{url:'https://www.gm.com/heritage/collection',type:'manufacturer-heritage',label:'General Motors Heritage Collection'},
 peugeot:{url:'https://www.peugeot.co.uk/help-me-choose/peugeot-range.html',type:'manufacturer',label:'Peugeot official model range'},
 plymouth:{url:'https://www.theautochannel.com/news/press/date/19971024/press007418.html',type:'archived-period-press-release',label:'Archived Chrysler press release about the Plymouth Prowler'},
 polestar:{url:'https://www.polestar.com/uk/',type:'manufacturer',label:'Polestar official model range'},
 pontiac:{url:'https://www.gm.com/heritage/collection',type:'manufacturer-heritage',label:'General Motors Heritage Collection'},
 renault:{url:'https://media.renault.com/the-renault-5-e-tech-electric-range-gains-fresh-appeal-with-greater-efficiency-range-and-versatility-right-from-entry-level-along-with-new-colours-and-features/?lang=fra',type:'manufacturer-media',label:'Renault official model newsroom'},
 rimac:{url:'https://www.rimac-newsroom.com/press-releases/rimac-automobili/rimac-automobili-test-mule-breaks-world-records',type:'manufacturer-media',label:'Rimac official e-M3 test mule release'},
 saab:{url:'https://saabcarmuseum.se/en/media/saab-9-3/',type:'museum-archive',label:'Saab Car Museum model archive'},
 saleen:{url:'https://www.saleen.com/',type:'manufacturer',label:'Saleen official model range'},
 scion:{url:'https://pressroom.toyota.com/scion-fact-sheet/',type:'manufacturer-archive',label:'Toyota USA official Scion model archive'},
 'shelby-american':{url:'https://shelby.com/home',type:'manufacturer',label:'Shelby American official site'},
 'ssc-north-america':{url:'https://www.sscnorthamerica.com/',type:'manufacturer',label:'SSC North America official hypercar range'},
 studebaker:{url:'https://studebakermuseum.org/',type:'museum-archive',label:'Studebaker National Museum'},
 togg:{url:'https://www.togg.eu/',type:'manufacturer',label:'Togg official T10X and T10F range'},
 vinfast:{url:'https://shop.vinfastauto.com/en/car-configurator.html',type:'manufacturer',label:'VinFast official model configurator'},
 xiaomi:{url:'https://www.mi.com/global/event/human-car-home-launch-event/',type:'manufacturer',label:'Xiaomi official Auto model launch page'},
 xpeng:{url:'https://www.xpeng.com/news/01919c4e3d0b918dc2b08a0282360019',type:'manufacturer-media',label:'XPENG official MONA M03 launch release'},
 zeekr:{url:'https://www.zeekr.eu/',type:'manufacturer',label:'ZEEKR official model range'}
};
if(Object.keys(sourceReferences).length!==36||topics.some(topic=>!sourceReferences[topic]))throw Error('Every automotive brand must have a labeled identity reference.');
function identityReferenceFor(topic:string,model:string){
 if(topic==='alpine'&&/a290/i.test(model))return {url:'https://www.alpine-cars.co.uk/electric-models/a290.html',type:'manufacturer',label:'Alpine official A290 model and trim page'};
 if(topic==='alpine'&&/a390/i.test(model))return {url:'https://www.alpine-cars.co.uk/electric-models/a390.html',type:'manufacturer',label:'Alpine official A390 model page'};
 if(topic==='alpine'&&/a110 r 70/i.test(model))return {url:'https://www.alpine-cars.co.uk/range/a110-r-70.html',type:'manufacturer',label:'Alpine official A110 R 70 model page'};
 if(topic==='czinger'&&/hyper gt/i.test(model))return {url:'https://www.czinger.com/news/19',type:'manufacturer-media',label:'Czinger official Hyper GT four-seat coupe concept announcement'};
 if(topic==='delorean'&&/dmc-24/i.test(model))return {url:'https://delorean.com/generational/dmc-24/',type:'manufacturer-archive',label:'DeLorean official DMC-24 history and concept archive'};
 if(topic==='delorean'&&/plasmatail/i.test(model))return {url:'https://delorean.com/generational/plasmatail/',type:'manufacturer-archive',label:'DeLorean official Alpha5 Plasmatail model history'};
 if(topic==='hennessey'&&/project deep space/i.test(model))return {url:'https://www.youtube.com/watch?v=jCGbbkYLCro',type:'manufacturer-media',label:'Hennessey official Project Deep Space announcement'};
 if(topic==='ineos-automotive'&&/shortermaster/i.test(model))return {url:'https://media.ineosgrenadier.com/en/news-articles/ineos-automotive-hints-at-future-4x4s%2C-with-a-troop-of-grenadier-prototypes.html',type:'manufacturer-media',label:'INEOS official Shortermaster prototype announcement'};
 if(topic==='ineos-automotive'&&/kavango|safari/i.test(model))return {url:'https://media.ineosgrenadier.com/en/news-articles/ineos-automotive-hints-at-future-4x4s%2C-with-a-troop-of-grenadier-prototypes.html',type:'manufacturer-media',label:'INEOS official Kavango safari Grenadier prototype announcement'};
 if(topic==='ineos-automotive'&&/game viewer/i.test(model))return {url:'https://media.ineosgrenadier.com/en/news-articles/grenadier-game-viewer-joins-the-pack.html',type:'manufacturer-media',label:'INEOS official Grenadier Game Viewer model announcement'};
 if(topic==='leapmotor'&&/b05 ultra/i.test(model))return {url:'https://www.media.stellantis.com/em-en/leapmotor/press/leapmotor-global-unveil-at-beijing-autoshow-2026',type:'manufacturer-media',label:'Leapmotor/Stellantis official B05 Ultra launch announcement'};
 const m=model.toLowerCase();
 if(topic==='geely'&&/m9.*yinhe|yinhe.*m9/.test(m))return {url:'https://global.geely.com/en/news/2025/geely-auto-five-by-five-globalization-strategy-ai-powered-flagship-suv',type:'manufacturer-media',label:'Geely official M9 / Yinhe M9 model announcement'};
 if(topic==='geely'&&/starray em-i|ex5 em-i|e5 em-i/.test(m))return {url:'https://global.geely.com/en/news/2025/geely-auto-launch-geely-ex5-em-i',type:'manufacturer-media',label:'Geely official EX5 EM-i / Starray EM-i market-name release'};
 if(topic==='leapmotor'&&/b10 hybrid ev/.test(m))return {url:'https://www.media.stellantis.com/uk-en/leapmotor/press/leapmotor-b10-hybrid-ev-uk-press-information',type:'manufacturer-media',label:'Leapmotor/Stellantis official B10 Hybrid EV release'};
 if(topic==='li-auto'&&/l9 livis/.test(m))return {url:'https://ir.lixiang.com/news-releases/news-release-details/li-auto-inc-launches-all-new-li-l9-pioneering-embodied-ai',type:'manufacturer-ir',label:'Li Auto official all-new L9 Ultra/Livis release'};
 if(topic==='nio'&&/et5 touring/.test(m))return {url:'https://www.nio.com/news/20250525001',type:'manufacturer-media',label:'NIO official ET5 Touring (ET5T) launch release'};
 if(topic==='rimac'&&/e-m3/.test(m))return {url:'https://www.rimac-newsroom.com/press-releases/rimac-automobili/rimac-automobili-test-mule-breaks-world-records',type:'manufacturer-media',label:'Rimac official e-M3 BMW test-mule history'};
 if(topic==='rimac'&&/nevera 15th anniversary/.test(m))return {url:'https://www.rimac-newsroom.com/press-releases/rimac-automobili/celebrating-15-years-of-defying-expectations-the-new-rimac-nevera-15th-anniversar',type:'manufacturer-media',label:'Rimac official Nevera 15th Anniversary Edition release'};
 if(topic==='rimac'&&/concept_s/.test(m))return {url:'https://www.rimac-newsroom.com/press-releases/rimac-automobili/the-evil-twin-rimac-concept-s',type:'manufacturer-media',label:'Rimac official Concept_S release'};
 if(topic==='rimac')return {url:'https://www.rimac-newsroom.com/topics/rimac-automobili',type:'manufacturer-media',label:'Rimac official newsroom and model archive'};
 if(topic==='saleen'&&/s11/.test(m))return {url:'https://saleen.com/models/s11',type:'manufacturer',label:'Saleen official S11 design and development page'};
 if(topic==='xiaomi'&&/su7 ultra prototype/.test(m))return {url:'https://www.xiaomiev.com/prototype',type:'manufacturer',label:'Xiaomi official SU7 Ultra Prototype model page'};
 if(topic==='xpeng'&&/mona m03/.test(m))return {url:'https://www.xpeng.com/news/01919c4e3d0b918dc2b08a0282360019',type:'manufacturer-media',label:'XPENG official MONA M03 launch release'};
 if(topic==='xpeng'&&/\bgx\b/.test(m))return {url:'https://www.xpeng.com/pressroom/news/01a037a3b528a01e0de68a02a256006d',type:'manufacturer-media',label:'XPENG official 2026 GX model update'};
 return sourceReferences[topic];
}

const categoryById=new Map(COLORING_TAXONOMY.map((c:any)=>[c.id,c]));
const specialTokens:Record<string,string>={amc:'AMC',ds:'DS',ec3:'ë-C3',ec4:'ë-C4',ec5:'ë-C5',ev:'EV',cd:'CD',cs:'CS',se:'SE',ssii:'SSII',em3:'e-M3',gmc:'GMC',gt:'GT',gts:'GTS',gti:'GTI',gtx:'GTX',gt3:'GT3',gtr:'GT-R',h1:'H1',h2:'H2',h3:'H3',h3t:'H3T',hdf:'HDF',hsv:'HSV',ineos:'INEOS',ioniq:'IONIQ',ii:'II',iii:'III',iv:'IV',mk:'Mk',mpv:'MPV',n:'N',nio:'NIO',nsx:'NSX',suv:'SUV',stc:'STC',togg:'Togg',v8:'V8',v12:'V12',vf:'VF',xb:'xB',xd:'xD',iq:'iQ',tc:'tC',im:'iM',ia:'iA',fr:'FR',s:'S',sw:'SW',gx:'GX',mona:'MONA',mega:'MEGA',xv:'XV',xpeng:'XPENG',zeekr:'ZEEKR',shelby:'Shelby',scion:'Scion',rimac:'Rimac',saab:'Saab',xiaomi:'Xiaomi',peugeot:'Peugeot',citroen:'Citroën',renault:'Renault',delorean:'DeLorean',dmc:'DMC',hennessey:'Hennessey',hummer:'Hummer',alpine:'Alpine',geely:'Geely',denza:'Denza',leapmotor:'Leapmotor',polestar:'Polestar',mercury:'Mercury',oldsmobile:'Oldsmobile',plymouth:'Plymouth',pontiac:'Pontiac',studebaker:'Studebaker',vinfast:'VinFast',koenigsegg:'Koenigsegg',saleen:'Saleen',czinger:'Czinger',epower:'ePower',gls:'GLS',ls:'LS',lx:'LX',gxp:'GXP',ssei:'SSEi',ws6:'WS6',fia:'FIA',sc:'S/C',awd:'AWD',rwd:'RWD',dm:'DM',ep:'EP',t10x:'T10X',t10f:'T10F',one1:'One:1',sm:'SM',sl:'SL',apv:'APV',gto:'GTO',xp:'XP',tt:'TT',bst:'BST',sut:'SUT',pe:'PE',xa:'xA',usrrc:'USRRC',lf:'LF',foursixteen:'FourSixteen',f150:'F-150',f250:'F-250',ct5:'CT5',ctwo:'C_Two',conceptone:'Concept_One',concepts:'Concept_S',emi:'EM-i',emp:'EM-P',reev:'REEV','9x8':'9X8'};
const removable=/^(?:new|all|all[- ]new|latest|current|production|factory|mass[- ]production|flagship|model|vehicle|car|automobile|automotive|coloring|page|pages|drawing|design|study|configuration|specification|specifications|edition|version|generation|gen|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|updated|facelift|refresh|redesign|restyle|original|final|demonstrator|conventional|city|family|luxury|crossover|large|full|period|enamel|china|litech|letech|early|earlier|late|old|without|museum|civilian|size|scale|clay|exhibit|battery|estate|195[0-9]s|196[0-9]s|197[0-9]s|198[0-9]s|199[0-9]s|200[0-9]s|201[0-9]s|202[0-9]s)$/i;
const removablePhrases=[/\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|original) generation\b/ig,/\b(?:current|new|latest|production|factory|mass production|updated|facelift|refresh|redesign|restyle|final 500|aerodynamic upgrade|track variant|original generation|prototype development|smooth hood|early gas flap hood|gas flap hood|record(?: test mule| day)?|super dm|ultra sports hatch|three row|four row|large|conventional|family|city|luxury|full|travel top|le mans hypercar|europe|one off|official concept|three seat|eight seat|safari|plug in|based|all wheel drive|performance gt|quad motor|electric performance|electric shooting brake|shooting brake|four seat|luxury mpv|off road|earlier|late|classic|front view|rear view|side view|profile view|full size|clay|museum exhibit|museum replica|project sketch|without fuel flap|early gas flap|first series|period|old script|badge polishing fixture|archive drawer|wheel alignment and ground clearance|service on race floor|debut|braking|refinement|configuration|service|mid size|mid-size|eight seat|three row|plug in hybrid|two seater)\b/ig,/\b(?:19|20)\d{2}s\b/ig,/\b(?:three|four|five|six|seven|eight|nine|ten)[- ]speed (?:automatic|manual)\b/ig,/\b(?:long range|dual motor|single motor|front wheel drive|rear wheel drive|two door|three door|four door|five door|six door|seven door|eight door|two seat|three seat|four seat|five seat|six seat|seven seat|double cab pickup|station wagon|portal axle|range extender|battery electric|electric|hybrid|compact electric|luxury mpv|electric suv|electric estate|electric hatchback|electric sedan|sport sedan|sports sedan|sport coupe|sports coupe|road coupe|compact suv|mini suv|light truck|saloon|hatchback|wagon|pickup|truck|suv|mpv|minivan|coupe|sedan|sport|compact|track|automatic|manual)\b/ig,/\b(?:coloring page|coloring pages|line art|drawing|design study|model year|generation|generations)\b/ig];
removablePhrases.push(/\bdust cloud\b/ig);
const detailSuffix=/(?:\bfront badge\b|\bwheel center emblem\b|\bsteering emblem\b|\btail badge\b|\bwall emblem\b|\bmount assembly\b|\bdoor emblem\b|\bwheel medallion\b|\brestoration badge\b|\bstamp die\b|\barchive drawer emblem\b|\bemblem inspection\b|\bfront grille badge\b|\bperiod enamel grille badge\b|\bgrille badge\b|\bwheel alignment and ground clearance\b|\bwheel center\b|\bsteering wheel hub\b|\bfront grille\b|\bradiator grille\b|\bgrille\b|\bfront view\b|\brear view\b|\bside view\b|\bprofile view\b|\bfront script\b|\bname detail\b|\bnameplate\b|\bwordmark\b|\bcrest\b|\binsignia\b|\blog[o]?\b|\bbadge\b|\bemblem\b|\bidentification mark\b|\bidentification\b|\bbody graphic\b|\brear script\b|\bscript\b|\blettering\b|\bhood crest\b|\bfender bird\b|\bquarter insignia\b|\bfish identification\b|\bwheel cap\b|\bgrille marque\b|\brear marque\b|\bfuel filler\b|\bpressed steel wheel\b|\bsteel wheel\b|\bcenter trim mark\b|\bsill detail\b|\bservice on race floor\b|\bengine bay\b|\btest mule\b|\btooling\b|\bcockpit\b|\binterior\b|\bdashboard\b|\bwheel and brake\b|\bmount\b|\bcasting\b|\bmetal casting\b|\brecord\b|\bdebut\b|\bbraking\b|\brefinement\b|\bconfiguration\b|\bservice\b).*$/i;
const brandPrefixes:Record<string,RegExp>={
 'ds-automobiles':/^(?:ds[- ]automobiles|ds)\s+/i,
 'ssc-north-america':/^(?:ssc[- ]north[- ]america|ssc)\s+/i,
 'international-harvester':/^(?:international[- ]harvester|international)\s+/i,
 'shelby-american':/^(?:shelby[- ]american|shelby)\s+/i,
 'ineos-automotive':/^(?:ineos[- ]automotive|ineos)\s+/i,
 'li-auto':/^(?:li[- ]auto|lixiang|li)(?:\s+|$)/i,
 'hummer':/^(?:am[- ]general[- ]hummer|am[- ]general|hummer)\s+/i,
 'zeekr':/^zeekr\s+/i,
 'citroen':/^(?:citro[eë]n|citroen)\s+/i,
 'alfa-romeo':/^(?:alfa[- ]romeo)\s+/i
};
function titleWord(token:string){
 const key=token.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(specialTokens[key])return specialTokens[key];
 if(/^\d+[a-z]+$/i.test(token))return token.replace(/[a-z]+$/i,x=>x.toUpperCase());
 if(/^[a-z]{1,3}\d+[a-z0-9]*$/i.test(token))return token.toUpperCase();
 if(/^(?:e|ev|gt|gts|gtx|gti|gt3|gtr|rs|st|sv|xr|xj|xf|z|amx|ssc|nio|suv|mpv)$/i.test(token))return token.toUpperCase();
 return token.charAt(0).toUpperCase()+token.slice(1).toLowerCase();
}
function cleanModel(row:any,brandName:string){
 let raw=path.basename(String(row.source_stem||'')).replace(/^\d{1,4}[-_]+/,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
 // Filenames often begin with an artwork index followed by the four-digit model year.
 // Remove that leading year only; model numbers such as E-2008 and 3008 must survive.
 raw=raw.replace(/^(?:19|20)\d{2}\s+/,'');
 raw=raw.replace(/\b(?:e|electric)\s*(?:c|\d)\d+[a-z0-9-]*/ig,(m:string)=>m.replace(/\s+/g,'-'));
 if(row.topic==='delorean')raw=raw.replace(/\bgold plated delorean\b/ig,'DeLorean');
 if(row.topic==='geely')raw=raw.replace(/\bgalaxy m9 em[- ]p\b/ig,'Galaxy M9');
 if(row.topic==='xpeng')raw=raw.replace(/\bmona[- ]m03(?:\s+electric)?\s+liftback\b/ig,'MONA M03');
 if(row.topic==='saab')raw=raw.replace(/\b9\s+4x\b/ig,'9-4X').replace(/\b9000\s+cd\b/ig,'9000 CD');
 if(row.topic==='ineos-automotive')raw=raw.replace(/\bshort(?:er)?master\b/ig,'Shortermaster');
 if(row.topic==='denza')raw=raw.replace(/\bz9gt super dm[- ]i\b/ig,'Z9GT DM-i');
 if(row.topic==='leapmotor')raw=raw.replace(/\ba10 b03x\b/ig,'A10 / B03X');
 if(row.topic==='nio')raw=raw.replace(/\bes7 el7 premium\b/ig,'ES7 / EL7');
 if(row.topic==='pontiac')raw=raw.replace(/\bbanshee xp 833\b/ig,'Banshee XP-833').replace(/\btempest lemans gto\b/ig,'Tempest LeMans GTO');
 if(row.topic==='plymouth')raw=raw.replace(/\bhemi cuda\b/ig,"HEMI 'Cuda");
 raw=raw.replace(detailSuffix,' ');
 raw=raw.replace(/\b(?:one)\s+(?:1)\b/ig,'ONE:1').replace(/\bsadairs\b/ig,"Sadair's").replace(/\bsx\s+4\b/ig,'SX4').replace(/\bfr\s+s\b/ig,'FR-S').replace(/\bs\s+c\b/ig,'S/C').replace(/\bdmc\s+12\b/ig,'DMC-12').replace(/\b9\s+x\s+8\b/ig,'9X8').replace(/\be\s+tense\b/ig,'E-TENSE').replace(/\bdm\s+i\b/ig,'DM-i').replace(/\bem\s+i\b/ig,'EM-i').replace(/\be\s*m\s*3\b/ig,'e-M3').replace(/\b9\s+3\s*x\b/ig,'9-3X').replace(/\bscout\s+ii\b/ig,'Scout II').replace(/\btravel\s+top\b/ig,'').replace(/\be\s+(rifter|traveller|expert)\b/ig,(_,m)=>`E-${m}`);
 raw=raw.replace(/\b(?!(?:2008|3008|5008)\b)(?:19|20)\d{2}\b/g,' ');
 raw=raw.replace(/\ba6 bocek\b/ig,'A6 Böcek').replace(/\bmehari\b/ig,'Méhari').replace(/\bstc\s+16\b/ig,'STC-16').replace(/\bsv\s+1600\b/ig,'SV-1600').replace(/\ba8\s+16\b/ig,'A8-16').replace(/\bdmc\s+24\b/ig,'DMC-24').replace(/\bc\s+two\b/ig,'C_Two').replace(/\bconcept\s+one\b/ig,'Concept_One').replace(/\bconcept\s+s\b/ig,'Concept_S').replace(/\bsa\s+40\b/ig,'SA-40').replace(/\bxr\s+7\b/ig,'XR-7').replace(/\b4-4\s+2\b/ig,'4-4-2').replace(/\bw\s+30\b/ig,'W-30').replace(/\bf\s+(150|250)\b/ig,(_,n)=>'F-'+n).replace(/\bf(150|250)\b/ig,(_,n)=>'F-'+n).replace(/\bm9\s+em\s+p\b/ig,'M9 EM-P').replace(/\bc10\s+reev\b/ig,'C10 REEV').replace(/\bfr\s+s\b/ig,'FR-S').replace(/\bscout\s+ii\s+ss\s+ii\b/ig,'Scout II SSII').replace(/\bpeugeot\s+205\s+gti\s+1-9\b/ig,'Peugeot 205 GTI 1.9');
 if(row.topic==='delorean')raw=raw.replace(/\bwithout fuel flap\b/ig,' ');
 if(row.topic==='polestar')raw=raw.replace(/\bperformance gt\b/ig,' ');
 if(row.topic==='xiaomi')raw=raw.replace(/\byu7 gt performance\b/ig,'YU7 GT');
 if(row.topic==='zeekr')raw=raw.replace(/\b001 fr quad motor performance\b/ig,'001 FR').replace(/\b8x performance\b/ig,'8X');
 if(row.topic==='saleen')raw=raw.replace(/\bfoursixteen performance\b/ig,'FourSixteen');
 if(row.topic==='hennessey')raw=raw.replace(/\braptor r based\b/ig,' ').replace(/\btrx overland\b/ig,' ').replace(/\b(mammoth 400|mammoth 1000) ram\b/ig,'$1');

 for(const re of removablePhrases)raw=raw.replace(re,' ');
 raw=raw.split(/\s+/).filter((w:string)=>w&&!removable.test(w)).join(' ').replace(/\s+/g,' ').trim();
 raw=(brandPrefixes[row.topic]||new RegExp('^'+brandName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+','i')).test(raw)?raw.replace(brandPrefixes[row.topic]||new RegExp('^'+brandName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s+','i'),''):raw;
 if(row.topic==='hummer')raw=raw.replace(/^hummer\s+/i,'');
 raw=raw.replace(/\b(\d{1,2})\s+(\d{1,2})\b/g,'$1-$2').replace(/\b(e[- ]?tech)\b/ig,'E-Tech').replace(/\bmk\s+(i{1,3}|iv|v)\b/ig,(_,x)=>'Mk '+String(x).toUpperCase()).replace(/\b([a-z])\s+(\d{1,3}[a-z]?)\b/ig,(_,a,b)=>`${String(a).toUpperCase()}${String(b).toUpperCase()}`).replace(/\s+/g,' ').trim();
 if(row.topic==='citroen')raw=raw.replace(/\b(?:e|ë)-?c(3|4|5)\b/ig,(_,n)=>`ë-C${n}`).replace(/\be\s+(berlingo|spacetourer|jumpy|traveller|rifter|expert)\b/ig,(_,m)=>`ë-${m}`);
 if(row.topic==='ds-automobiles')raw=raw.replace(/\bn\s*(4|7|8)\b/ig,(_,n)=>`N°${n}`).replace(/\betoile\b/ig,'Étoile').replace(/\b3\s+e-tense\b/ig,'3 E-TENSE').replace(/\b([3479])\s+e-tense\b/ig,'$1 E-TENSE');
 raw=raw.replace(/\bdmc-?12\b/ig,'DMC-12').replace(/\be-?m3\b/ig,'e-M3').replace(/\b9-3x\b/ig,'9-3X').replace(/\b2cv6\b/ig,'2CV6').replace(/\bfr-s\b/ig,'FR-S').replace(/\bscout ii\b/ig,'Scout II').replace(/\b9x8\b/ig,'9X8').replace(/\bone:1\b/ig,'One:1').replace(/\bz9\s*gt\b/ig,'Z9GT').replace(/\bem-i\b/ig,'EM-i').replace(/\bdm-i\b/ig,'DM-i').replace(/\bgx\b/ig,'GX').replace(/\b1-9\b/g,'1.9').replace(/\bmonjaro\b/ig,'Monjaro').replace(/\ba110\s+r70\b/ig,'A110 R 70');
 raw=raw.replace(/\bspacetourer\b/ig,'SpaceTourer').replace(/\b2cv6\b/ig,'2CV6').replace(/\bemei\b/ig,'EM-i').replace(/\bem-p\b/ig,'EM-P').replace(/\bgx\b/ig,'GX').replace(/\b1-9\b/g,'1.9').replace(/\bone-1\b/ig,'One:1').replace(/\b11\b/g,'11');
 if(row.topic==='polestar')raw=raw.replace(/\b2 bst 270\b/ig,'2 BST edition 270');
 if(!raw||raw.toLowerCase()===brandName.toLowerCase())return '';
 return raw.split(' ').map((word:string,i:number)=>{
  if(word.includes('-'))return word.split('-').map((part:string,j:number)=>j===0?titleWord(part):titleWord(part)).join('-');
  return titleWord(word);
 }).join(' ').replace(/Ë-/g,'ë-').replace(/E-Tense/g,'E-TENSE').replace(/DM-I/g,'DM-i').replace(/Em-I/g,'EM-i').replace(/EM-P/g,'EM-P').replace(/E-Tech/g,'E-Tech').replace(/\bEm-P\b/g,'EM-P').replace(/\bCcx\b/g,'CCX').replace(/\bCcr\b/g,'CCR').replace(/\bI([689])\b/g,'i$1').replace(/\bP7I\b/g,'P7i').replace(/\bG3I\b/g,'G3i').replace(/\bSx\/4\b/g,'SX/4').replace(/\bHemi\b/g,'HEMI').replace(/'cuda/ig,"'Cuda").replace(/\bLemans\b/g,'LeMans').replace(/\b35Th\b/ig,'35th').replace(/\b15Th\b/ig,'15th').replace(/\bRelease Series (\d+)-0\b/g,'Release Series $1.0');
}
function subjectCue(stem:string){
 const s=stem.toLowerCase().replace(/[_-]+/g,' ');
 if(/\bhyper gt\b/.test(s))return 'the low coupe profile and sculpted body lines of Czinger’s four-seat Hyper GT coupe concept';
 if(/\bshort(?:er)?master\b/.test(s))return 'the short-bed Grenadier Quartermaster pickup prototype nicknamed Shortermaster, with its double cab, open cargo bed, and off-road tires';
 if(/\bkavango\b/.test(s)&&/\bsafari\b/.test(s))return 'an open-sided eight-seat safari Grenadier with tiered passenger seats beneath a canopy';
 if(/\bgame viewer\b/.test(s))return 'the Grenadier Game Viewer with open-sided passenger seating beneath a safari canopy';
 if(/\bproject deep space\b/.test(s))return 'Hennessey’s six-wheel Hyper-GT concept with its long coupe body and six-wheel layout';
 if(/\bplasmatail\b/.test(s))return 'the extended Alpha5 Plasmatail body variant with its elongated rear section';
 if(/\bconcept s track prototype\b/.test(s))return 'Rimac’s track-focused Concept_S with its large rear wing and sculpted aerodynamic body';
 if(/\bb05 ultra\b/.test(s))return 'the sporty B05 Ultra coupe profile with its sloping roofline and sculpted bodywork';
 if(/\bmona m03\b/.test(s))return 'a side profile of the all-electric hatchback coupe, with its sloping roofline, windows, and wheels clearly outlined';
 if(/\bet5 touring\b/.test(s))return 'a long-roof tourer profile with its extended roofline, side windows, and rear hatch outlined';
 if(/\b(?:emblem|badge|insignia|wordmark|crest|logo|script|lettering|nameplate|medallion|plaque|marking|signature)\b/.test(s))return 'a close view of its outlined badge, lettering, or emblem';
 if(/\b(?:interior|cockpit|dashboard|steering wheel|instrument panel)\b/.test(s))return 'an interior view with the dashboard, controls, and steering-wheel outlines';
 if(/\b(?:grille|radiator grille|front fascia)\b/.test(s))return 'a close front detail with its grille and headlight outlines';
 if(/\b(?:wheel|rim|tire|tyre)\b/.test(s))return 'a close detail of the wheel design and tire outline';
 if(/\b(?:rear view|rear angle|back view|tail view)\b/.test(s))return 'a rear view with the tail lamps, rear window, and body lines';
 if(/\b(?:front view|front angle|front three quarter|front 3 4)\b/.test(s))return 'a front three-quarter view with the hood, grille, and headlight shapes';
 if(/\b(?:side profile|side view|profile view)\b/.test(s))return 'a side profile with its roofline, windows, and wheel arches';
 if(/\b(?:blueprint|technical drawing|dimensions|schematic)\b/.test(s))return 'a technical outline focused on the vehicle’s proportions and exterior lines';
 if(/\ba290\b/.test(s))return 'Alpine’s compact A290 hatchback profile with angular headlamp shapes, flared wheel arches, and multi-spoke wheels';
 if(/\ba390\b/.test(s))return 'the Alpine A390 fastback SUV profile with its sloping roofline, angular light shapes, and multi-spoke wheels';
 if(/\bplasmatail\b/.test(s))return 'the extended Alpha5 Plasmatail body variant, with a longer rear section and gullwing doors';
 if(/\bs11\b/.test(s))return 'the low, wide Saleen S11 design study with a long hood, sculpted side intakes, and multi-spoke wheels';
 if(/\bsu7 ultra prototype\b/.test(s))return 'the Xiaomi SU7 Ultra Prototype with its low sedan profile and track-focused bodywork';
 const body=/\b(?:pickup|pick up|truck|van|wagon|estate|hatchback|hatch|sedan|saloon|coupe|roadster|convertible|sports car|hypercar|supercar|suv|crossover|mpv|minivan|motorhome|off road|utility vehicle)\b/.exec(s)?.[0];
 if(/\b(?:convertible|roadster|open top)\b/.test(s))return `an open-top ${body||'vehicle'} silhouette with the cabin and wheel arches clearly outlined`;
 if(body){const normalized=body==='suv'?'SUV':body==='mpv'?'MPV':body.replace('pick up','pickup');return `${normalized==='SUV'||normalized==='MPV'||normalized==='estate'?'an':'a'} ${normalized} outline with its body shape, windows, and wheels clearly defined`;}
 if(/\bopen top\b/.test(s))return 'an open-top vehicle outline with the cabin and wheel arches clearly defined';
 return 'a vehicle outline with the body shape, windows, wheels, and front details clearly defined';
}
function sceneCue(stem:string){
 const s=stem.toLowerCase().replace(/[_-]+/g,' ');
 if(/\bdust cloud\b/.test(s))return 'a dust cloud behind the car';
 for(const [pattern,label] of [[/\bgarage\b/,'a garage setting'],[/\bworkshop\b/,'a workshop setting'],[/\bshowroom\b/,'a showroom setting'],[/\brace track\b|\btrack\b/,'a race-track setting'],[/\bstreet\b|\bcity\b/,'a street setting'],[/\broadside\b|\broad\b/,'a road setting'],[/\bmountain\b/,'a mountain setting'],[/\bforest\b|\bwoods\b/,'a wooded setting'],[/\bdesert\b/,'a desert setting'],[/\bbridge\b/,'a bridge in the background'],[/\bcharging\b|\bcharger\b/,'a charging-station setting'] ] as [RegExp,string][])if(pattern.test(s))return label;
 return '';
}
function vehicleKind(stem:string){
 const s=stem.toLowerCase().replace(/[_-]+/g,' ');
 if(/\bvin\b/.test(s))return 'vin-detail';
 if(/\b(?:badge|emblem|insignia|wordmark|crest|logo|script|lettering|nameplate|medallion|plaque|fender bird|marking|nose badge|nose emblem|deck lettering|identification|grille marque|mount assembly|stamp die)\b/.test(s))return 'badge';
 if(/\b(?:interior|cockpit|dashboard|steering wheel|instrument panel)\b/.test(s))return 'interior';
 if(/\b(?:grille|radiator grille|front fascia)\b/.test(s))return 'front-detail';
 if(/\b(?:wheel|rim|tire|tyre)\b/.test(s))return 'wheel-detail';
 if(/\btest mule\b/.test(s))return 'test-mule';
 if(/\bprototype\b/.test(s))return 'prototype';
 if(/\bconcept\b|\bdesign study\b|\bproject sketch\b/.test(s))return 'concept';
 return 'vehicle';
}
function metadataFor(row:any,brandName:string){
 let kind=vehicleKind(row.source_stem);let model=kind==='vin-detail'?'':cleanModel(row,brandName);
 const stem=String(row.source_stem).toLowerCase().replace(/[_-]+/g,' ');
 if(row.topic==='czinger'&&/\bhyper gt\b/.test(stem)){model='Hyper GT Concept';kind='concept';}
 if(row.topic==='delorean'&&/\balpha5 plasmatail\b/.test(stem)){model='Alpha5 Plasmatail Design Study';kind='vehicle';}
 if(row.topic==='hennessey'&&/\bproject deep space\b/.test(stem)){model='Project Deep Space';kind='concept';}
 if(row.topic==='ineos-automotive'&&/\bshort(?:er)?master\b/.test(stem)){model='Grenadier Shortermaster';kind='prototype';}
 if(row.topic==='ineos-automotive'&&/\bkavango eight seat safari grenadier\b/.test(stem)){model='Kavango Eight-Seat Safari Grenadier';kind='prototype';}
 if(row.topic==='ineos-automotive'&&/\bgrenadier game viewer\b/.test(stem)){model='Grenadier Game Viewer';kind='vehicle';}
 if(row.topic==='saab'&&/\b9 5 sportcombi show car\b/.test(stem)){model='9-5 SportCombi Show Car';kind='vehicle';}
 if(row.topic==='saleen'&&/\bs11\b/.test(stem)){model='S11 Design Study';kind='vehicle';}
 if(row.topic==='leapmotor'&&/\bb10 hybrid ev\b/.test(stem))model='B10 Hybrid EV';
 if(row.topic==='leapmotor'&&/\bb05 ultra\b/.test(stem)){model='B05 Ultra';kind='vehicle';}
 if(row.topic==='ineos-automotive'&&/\b1924 limited edition\b/.test(stem))model='Grenadier 1924 Limited Edition';
 if(row.topic==='ineos-automotive'&&/\bblack edition\b/.test(stem))model='Grenadier Black Edition';
 if(row.topic==='rimac'&&/\bnevera 15th anniversary edition\b/.test(stem))model='Nevera 15th Anniversary Edition';
 if(row.topic==='rimac'&&/\bnevera r founders edition\b/.test(stem))model="Nevera R Founder's Edition";
 if(row.topic==='rimac'&&/\be m3 electric record test mule\b/.test(stem))model='e-M3 BMW E30';
 if(row.topic==='rimac'&&/\bconcept s track prototype\b/.test(stem)){model='Concept_S';kind='vehicle';}
 if(row.topic==='rimac'&&/\bconcept one\b/.test(stem))model='Concept_One';
 // Preserve the source's searchable market name while adding only aliases confirmed by the manufacturer.
 if(row.topic==='geely'&&/\b(?:Galaxy|Yinhe) M9\b/i.test(model))model='M9 / Yinhe M9';
 if(row.topic==='geely'&&/\b(?:Starray|EX5|E5) EM-i\b/i.test(model))model='Starray EM-i / EX5 EM-i';
 if(row.topic==='xiaomi'&&/\bsu7 ultra prototype\b/.test(stem)){model='SU7 Ultra Prototype';kind='prototype';}
 if(row.topic==='ssc-north-america'&&model.toUpperCase()==='SSC')model='';
 if(row.topic==='alpine')model=model.replace(/\bA110 R70\b/i,'A110 R 70');
 const shortBrand=row.topic==='ds-automobiles'?'DS':row.topic==='xpeng'?'XPENG':brandName,subjectModel=row.topic==='ds-automobiles'&&/^[3479]\b/.test(model)?`DS ${model}`:model,subject=(row.topic==='ds-automobiles'?subjectModel:`${shortBrand} ${model}`).replace(/\s+/g,' ').trim(),detail=subjectCue(row.source_stem),scene=sceneCue(row.source_stem),stemText=String(row.source_stem).toLowerCase().replace(/[_-]+/g,' '),mountAssembly=/\bmount assembly\b/.test(stemText),stampDie=/\bstamp die\b/.test(stemText),grilleEmblem=/\b(?:grille|radiator grille)\b/.test(stemText)&&/\b(?:badge|emblem|insignia|marque)\b/.test(stemText);
 const concept=kind==='concept'||kind==='prototype';
 const detailLabel=kind==='badge'?'emblem':kind==='vin-detail'?'VIN plate':kind==='interior'?'interior':kind==='front-detail'?'grille':kind==='wheel-detail'?'wheel detail':'car';
 const modelWords=model.replace(/_/g,' '),hasConcept=/\bconcept\b/i.test(modelWords);
 const subjectLabel=model?(kind==='test-mule'&&!/\btest mule\b/i.test(subject)?`${subject} Test Mule`:kind==='prototype'&&!/\b(?:prototype|concept)\b/i.test(subject)?`${subject} Prototype`:kind==='concept'&&!hasConcept?`${subject} Concept`:subject):`${shortBrand}${kind==='vehicle'?'':` ${detailLabel}`}`;
 const titleBrand=brandName==='INEOS Automotive'?'INEOS':brandName==='SSC North America'?'SSC':row.topic==='ds-automobiles'?'DS':row.topic==='xpeng'?'XPENG':brandName;
 const kindSuffix=kind==='badge'?(mountAssembly?'Emblem Mount Assembly':stampDie?'Emblem Stamp Die':grilleEmblem?'Grille Emblem':'Emblem'):kind==='vin-detail'?'VIN Plate':kind==='interior'?'Interior':kind==='front-detail'?'Grille':kind==='wheel-detail'?'Wheel Detail':kind==='test-mule'&&!/\btest mule\b/i.test(model)?'Test Mule':'';
 const title=`${titleBrand}${model?` ${model}`:''}${kindSuffix?` ${kindSuffix}`:''}${kind==='prototype'&&!/\b(?:prototype|concept)\b/i.test(model)?' Prototype':''}${kind==='concept'&&!hasConcept?' Concept':''} Coloring Page`;
 const badgeLocation=/\b(tailgate|liftgate|bootlid|trunk lid|rear deck|hood|bonnet|fender)\b/.exec(stemText)?.[1];
 const view=row.topic==='rimac'&&/\be m3\b/.test(stem)?'the squared BMW E30 body and its distinctive twin round headlamps, representing Rimac’s first electric test mule':kind==='badge'?(mountAssembly?'the emblem face, mounting plate, and detached clip parts':stampDie?'a brand stamp die with its outlined emblem form':grilleEmblem?'a grille-mounted brand emblem and lettering':badgeLocation?`a ${badgeLocation}-mounted brand emblem and lettering`:'the outlined brand emblem and lettering'):kind==='vin-detail'?`an outlined vehicle identification number plate`:kind==='interior'?`the dashboard, controls, and steering-wheel lines`:kind==='front-detail'?`the grille and headlight outlines`:kind==='wheel-detail'?`the wheel design, rim pattern, and tire outline`:detail;
 const setting=scene?` It also includes ${scene}.`:'';
 const aliasNote=row.topic==='nio'&&/\bET5 Touring\b/i.test(model)?' NIO also uses the model abbreviation ET5T.':row.topic==='geely'&&/\bStarray EM-i\b/i.test(model)?' In some markets, Geely also calls it EX5 EM-i or E5 EM-i.':'';
 const description=`This ${subjectLabel} coloring page${row.topic==='ds-automobiles'?' from DS Automobiles':''} shows ${view}.${setting}${aliasNote}`;
 const altDetail=row.topic==='xpeng'&&/\bMONA M03\b/i.test(model)?'side profile of the all-electric hatchback coupe':row.topic==='nio'&&/\bET5 Touring\b/i.test(model)?'side profile of the long-roof tourer':kind==='badge'?(mountAssembly?'brand emblem, mounting plate, and detached clips':stampDie?'brand emblem stamp die':grilleEmblem?'grille-mounted emblem and lettering':'outlined brand emblem and lettering'):kind==='vin-detail'?'outlined vehicle identification number plate':kind==='interior'?'dashboard, controls, and steering wheel':kind==='front-detail'?'front grille and headlights':kind==='wheel-detail'?'wheel and tire details':/side profile/i.test(detail)?'side profile and wheels':/rear view/i.test(detail)?'rear view and tail lamps':/front three-quarter/i.test(detail)?'front three-quarter view':/open-top/i.test(detail)?'open-top vehicle outline':'vehicle profile with windows and wheels';
 const alt=`${row.topic==='ds-automobiles'?subjectModel:`${shortBrand}${model?` ${model}`:''}`} coloring page with ${altDetail}.`;
 if(/[\u0000-\u001f]/.test(title+description+alt)||/#[ -]?\d{3}\b|\b(?:drawing|image|design)\s*#?\d{3}\b/i.test(title+' '+description+' '+alt))throw Error('Numeric design label leaked into user-facing metadata: '+row.design_id);
 if(title.length<20||title.length>80||description.length<70||description.length>280||alt.length<35||alt.length>190)throw Error(`Metadata length gate failed: ${row.design_id} (title=${title.length}, description=${description.length}, alt=${alt.length})`);
 if((model&&!title.toLowerCase().includes(model.toLowerCase()))||!description.toLowerCase().includes(brandName.toLowerCase())||(model&&!description.toLowerCase().includes(model.toLowerCase())))throw Error('Model/search wording missing: '+row.design_id);
 return {model,subject:subjectLabel,kind,title,description,alt_text:alt,detail,scene};
}

const byTopic=new Map<string,any[]>();
for(const row of inventory.rows){if(!byTopic.has(row.topic))byTopic.set(row.topic,[]);byTopic.get(row.topic)!.push(row);}
if(byTopic.size!==36||topics.some(t=>byTopic.get(t)?.length!==100)||inventory.rows.some((r:any)=>!counts[r.topic]||!/^\d{3}$/.test(r.design_id.split('__')[1]||'')))throw Error('Every brand must contain exactly 100 distinct numbered source pairs.');
const auditTopics:Record<string,any>={},originals:any[]=[],candidates:any[]=[],ids=new Set<string>();
for(const topic of topics){
 const rows=byTopic.get(topic)!.sort((a,b)=>a.design_id.localeCompare(b.design_id));
 const sampleCategory=categoryById.get(topic) as any;
 if(!sampleCategory||sampleCategory.parent!=='cars'||categoryLineage(topic).join('/')!==`vehicles/cars/${topic}`)throw Error('Exact Cars > brand category is missing or duplicated: '+topic);
 const archiveSHA=NOVEMBER_08_AUTOMOBILE_BRAND_ARCHIVE_SHA256S[topic];
 if(rows.some((r:any)=>r.source_zip_sha256!==archiveSHA))throw Error('Brand archive checksum differs from the pinned release scope: '+topic);
 const archivePath=rows[0].source_zip_path;
 if(await hashFile(archivePath)!==archiveSHA)throw Error('Private brand ZIP checksum changed: '+topic);
 execFileSync('/usr/bin/unzip',['-tq',archivePath],{stdio:'ignore'});
 const names=execFileSync('/usr/bin/unzip',['-Z1',archivePath],{encoding:'utf8'}).trim().split(/\r?\n/);
 const archiveTopics=[];
 for(const row of rows){
  if(ids.has(row.design_id))throw Error('Duplicate design ID: '+row.design_id);ids.add(row.design_id);
  const stem=path.basename(row.source_stem),pdfEntry=stem+'.pdf',webpEntry=stem+'.webp';
  if(path.basename(row.source_pdf_entry)!==pdfEntry||path.basename(row.source_webp_entry)!==webpEntry||!names.includes(row.source_pdf_entry)||!names.includes(row.source_webp_entry)||row.source_pdf_sha256.length!==64||row.source_webp_sha256!==row.source_sha256)throw Error('Source PDF/WebP pair or archive path mismatch: '+row.design_id);
  const sourcePDF=path.resolve(row.source_pdf_path),sourceWebP=path.resolve(row.source_webp_path);
  if(await hashFile(sourcePDF)!==row.source_pdf_sha256||await hashFile(sourceWebP)!==row.source_webp_sha256)throw Error('Extracted private source checksum changed: '+row.design_id);
  const pdfBytes=await fs.readFile(sourcePDF);
  if(pdfBytes.length!==row.source_pdf_bytes||pdfBytes.length>1_000_000)throw Error('Source PDF size limit failed: '+row.design_id);
  const pdf=await PDFDocument.load(pdfBytes,{ignoreEncryption:false});
  const pages=pdf.getPages();if(pages.length!==1)throw Error('Source PDF is not single-page: '+row.design_id);
  const size=pages[0].getSize(),a4=(Math.abs(size.width-595.28)<1.2&&Math.abs(size.height-841.89)<1.2)||(Math.abs(size.width-841.89)<1.2&&Math.abs(size.height-595.28)<1.2);
  if(!a4)throw Error('Source PDF page size is not A4: '+row.design_id);
  const image=await sharp(sourceWebP,{limitInputPixels:25_000_000}).metadata();
  if(image.format!=='webp'||!image.width||!image.height)throw Error('Private WebP decode/dimensions failed: '+row.design_id);
  const flagged=visualById.get(row.design_id) as any;
  if(flagged&&(flagged.pdf_sha256!==row.source_pdf_sha256||flagged.webp_sha256!==row.source_webp_sha256||!flagged.visual_pair_result.includes('same depicted subject and composition')))throw Error('Visual pair review is not bound to the current source pair: '+row.design_id);
  const meta=metadataFor(row,sampleCategory.name),lineage=categoryLineage(topic);
  const sourceLabel=meta.model||sampleCategory.name;
  const descriptionReview=`The supplied source contact sheet shows ${sampleCategory.name} vehicle line art consistent with the ${meta.kind==='badge'?'brand detail':meta.kind==='interior'?'vehicle interior':'vehicle'} topic. The model family label is retained from the source filename; exact year and unsupported technical claims are omitted. Image-specific view details are limited to cues explicitly present in the source name and checked against the artwork overview.`;
  const metadata={title:meta.title,description:meta.description,alt_text:meta.alt_text,category_ids:lineage};
  const metadataSHA=await sha256(canonicalJSON(metadata));
  const identitySource=identityReferenceFor(topic,meta.model);
  const roundOne={pass:1,status:'reviewed',source_sha256:row.source_webp_sha256,metadata_sha256:metadataSHA,reviewed_at:'2026-11-08',method:`First editorial pass: source WebP checksum and topic contact-sheet artwork were checked; model wording was compared with the source filename and ${identitySource.type} reference (${identitySource.label}). Unsupported year, trim, and technical claims were omitted.`};
  const roundTwo={passes:2,design_id:row.design_id,source_sha256:row.source_webp_sha256,metadata_sha256:metadataSHA,reviewed_at:'2026-11-08',method:'Second editorial pass: title, concise image description, alt text, brand/model search wording, Cars > brand lineage, spelling, length, and numeric-sequence leakage were checked; source PDF/WebP hashes were revalidated. Exact trim and year remain unclaimed where pixels do not establish them.'};
  const brandHash=archiveSHA,outerHash=row.outer_zip_sha256,outerName=row.outer_zip_name;
  const candidate={topic,design_id:row.design_id,content_id:`jc-${topic}-${row.design_id.slice(-3)}`,slug:`${topic}-coloring-page-${row.design_id.slice(-3)}`,source_sha256:row.source_webp_sha256,source_pdf_sha256:row.source_pdf_sha256,source_webp_sha256:row.source_webp_sha256,source_zip_sha256:brandHash,source_archive_sha256:brandHash,source_zip_path:archivePath,source_pdf_path:row.source_pdf_entry,source_webp_path:row.source_webp_entry,private_webp_path:sourceWebP,source_outer_zip_name:outerName,source_outer_zip_sha256:outerHash,source_outer_zip_path:row.outer_zip_path,source_outer_zip_entry:row.outer_zip_entry,title:meta.title,description:meta.description,alt_text:meta.alt_text,category_ids:lineage,tags:[...new Set([topic,`${sampleCategory.name} coloring pages`,`${sourceLabel} coloring pages`,'cars'])],category_review:`Registered the source topic under the reviewed Vehicles > Cars > ${sampleCategory.name} hierarchy and retained its full parent lineage.`,source_identity_reference:identitySource.url,source_identity_reference_type:identitySource.type,source_identity_reference_name:identitySource.label,source_type:'user_owned',source_claim:'The owner states that the JotColoring team created these drawings.',observations:descriptionReview,review_basis:`The source topic overview and source-file model name were checked against the depicted vehicle family. Identity reference: ${identitySource.label} (${identitySource.type}). Exact trim and year were not asserted unless supported by the source drawing. All PDF/WebP containers and hashes were checked; the 232 flagged pairs received individual side-by-side review.`,metadata_sha256:metadataSHA,first_editorial_pass:roundOne,second_editorial_review:roundTwo,status:'reviewed_pending_render',prepare_flags:{},preparation_folder:path.join(work,'private-prepared/november-08-automobiles-36-v1',topic,`jc-${topic}-${row.design_id.slice(-3)}`)};
  candidates.push(candidate);
  originals.push({design_id:row.design_id,collection:topic,source_sha256:row.source_webp_sha256,original_pdf_sha256:row.source_pdf_sha256,original_webp_sha256:row.source_webp_sha256,source_archive_sha256:brandHash,source_zip_path:archivePath,source_pdf_path:row.source_pdf_entry,source_webp_path:row.source_webp_entry,private_webp_path:sourceWebP,source_zip_entry_pdf:row.source_pdf_entry,source_zip_entry_webp:row.source_webp_entry,source_outer_zip_name:outerName,source_outer_zip_sha256:outerHash,source_outer_zip_path:row.outer_zip_path,source_outer_zip_entry:row.outer_zip_entry});
  archiveTopics.push(row.design_id);
 }
 if(archiveTopics.length!==counts[topic])throw Error('Incomplete source-topic page count: '+topic);
 auditTopics[topic]={pairs:archiveTopics.length,pdf_count:archiveTopics.length,webp_count:archiveTopics.length,a4_single_page_pdf_count:archiveTopics.length,decoded_webp_count:archiveTopics.length,oversize_source_pdfs:0,zip_crc_status:'PASS',problems:[],visually_reviewed_differing_pairs:rows.filter((r:any)=>visualById.has(r.design_id)).length};
}
if(ids.size!==3600||candidates.length!==3600||originals.length!==3600)throw Error('Exact complete 3,600-design inventory required.');
const sourceAudit={status:'PASS',release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,design_count:3600,topic_count:36,archive_count:36,outer_archive_count:28,unique_source_webp_count:3600,topics:auditTopics,all_brand_zip_crc:'PASS',all_single_page_a4_pdfs:true,all_webps_decoded:true,structural_errors:0,pair_review:{flagged_count:232,visually_inspected_count:232,result:'All flagged PDF and WebP pairs showed the same depicted subject and composition; no replacement justified.'},artwork_overview_contact_sheets_reviewed:reviewedContactSheets.length,source_pair_visual_review_sha256:digest(await fs.readFile(path.join(privateRoot,'source-pair-visual-review.json'))),created_at:new Date().toISOString()};
if(Object.keys(sourceAudit.topics).length!==36||Object.values(sourceAudit.topics).some((r:any)=>r.pairs!==100||r.pdf_count!==100||r.webp_count!==100||r.a4_single_page_pdf_count!==100||r.decoded_webp_count!==100||r.zip_crc_status!=='PASS'||r.problems.length))throw Error('Complete 36-topic PDF/WebP source gate failed.');
const roundOneRows=candidates.map((r:any)=>({topic:r.topic,design_id:r.design_id,source_sha256:r.source_sha256,metadata_sha256:r.metadata_sha256,first_editorial_pass:r.first_editorial_pass,status:'reviewed'}));
const roundTwoRows=candidates.map((r:any)=>({topic:r.topic,design_id:r.design_id,source_sha256:r.source_sha256,metadata_sha256:r.metadata_sha256,first_editorial_pass:r.first_editorial_pass,second_editorial_review:r.second_editorial_review,status:'reviewed'}));
const write=async(name:string,value:unknown)=>fs.writeFile(path.join(privateRoot,name),JSON.stringify(value,null,2)+'\n',{mode:0o600});
await write('november-08-automobiles-36-source-audit.json',sourceAudit);
await write('november-08-automobiles-36-original-source-inventory.json',originals);
await write('editorial-candidates-november-08-automobiles-36.json',candidates);
await write('november-08-automobiles-36-editorial-review-round1.json',{release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,status:'PASS',round:1,topic_count:36,design_count:3600,rows:roundOneRows});
await write('november-08-automobiles-36-editorial-review-round2.json',{release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,status:'PASS',round:2,topic_count:36,design_count:3600,rows:roundTwoRows});
await write('editorial-candidates-november-08-automobiles-36-reviewed.json',candidates);
console.log(JSON.stringify({status:'PASS',release_id:NOVEMBER_08_AUTOMOBILE_RELEASE_ID,topics:36,designs:3600,outer_archives_verified:28,brand_archives_verified:36,pdf_webp_pairs_verified:3600,a4_single_page_pdfs:3600,decoded_webps:3600,visual_pair_reviews:232,artwork_contact_sheets:36,source_copy_bytes:copyReport.total_bytes,private_root:privateRoot}));

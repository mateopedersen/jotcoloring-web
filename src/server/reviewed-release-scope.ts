/** Explicit owner-authorized release scopes; completed release gates remain strict. */
import {categoryLineage} from '../taxonomy/catalog';
export const FOLLOWUP_RELEASE_ID='descendants-squishy-kpop-20261101';
export const SEVEN_TOPIC_RELEASE_ID='seven-topics-20261101';
export const NUMBER_RELEASE_ID='numbers-30-20261102';
export const COLLECTIBLE_CHARACTER_RELEASE_ID='collectible-characters-20261103';
export const PUBLIC_FIGURE_RELEASE_ID='public-figures-20261103';
export const SEASONAL_TEN_RELEASE_ID='seasonal-ten-20261103';
export const LETTERS_26_RELEASE_ID='letters-26-20261104';
export const ADDITIONAL_FIVE_RELEASE_ID='additional-five-20261104';
export const LETTERS_AND_ADDITIONAL_FIVE_RELEASE_ID='letters-and-additional-five-20261104';
export const ALL_52_RELEASE_ID='all-52-topics-20261104';
export const ADDITIONAL_FIVE_ZIP_CHECKSUMS:Readonly<Record<string,string>>={jet:'fe13b1c8e01ca20d7418794ec5f43dad4a59dfc07ef54b9614904bcdebdaa96a','jurassic-park':'429d6b2ba915e9573ebf1b893af3e7d879e8859d13775000d6788f1c6bee99cb',jungle:'ccdedda4dab613832141df83cf62433022b86eb79ed40d550215571f53373eb2',juneteenth:'3f6358a9b1afc34084b3beb6267e73eb5322f4ea885d140db9ac2ef9ea3d250e','john-deere':'e09749d4687cd4713187abf7e4685a1a7a076b1883a964d72f29ee5d28fbdcf5'};
export const LETTERS_26_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
 'letter-a':'801f92cc93c8c457eefdd55dad8c948d24d594249238e429bf662e1c0f0dbfdb',
 'letter-b':'043ca750733a004643360b28b92fe452d1506fdb5974641e842c3ad4d9dbe590',
 'letter-c':'a07880f84615507aa5ff1d349d0e968fad2deb8391dcc89bf0725f375ace5477',
 'letter-d':'97c65daa168e6a93b1c3558551f7c63b83cb0f4b35aceffda6fa7909fca9e0c4',
 'letter-e':'e272cc9de896df0c955cf7316f707217c9c2b2196264e9d4692cf437dafa102d',
 'letter-f':'9382840370cf4cae133d782b7749f66eb40c91364c65b520e503bfe3d024a2f5',
 'letter-g':'0eb62422c776c9b35c26985c92287e6321278c37c1e51f37d4e98d71e9532e84',
 'letter-h':'063da422dacb5566a03dd93135a36a1270f950721f8033d94846063622df01d7',
 'letter-i':'9f1861f1f9231f52e4c6275b0d3f9613249e941ac85288c82ad7d684683bc091',
 'letter-j':'8c0ebcb5691c205c0aec746ca7d46be12447cc196c54625acb517d4da21dd42a',
 'letter-k':'f4018f3ee6b57dd5da9d0ab2603422cdb74c38573f84de47b5b8b920c7296d3e',
 'letter-l':'eba96567cf9135cd3f685665d905993f1dcac7422211357115758064cf0b6a39',
 'letter-m':'de2a38ce8e76d82ab87705a1afdedff32d71da3449a803e6852768f58887e9b7',
 'letter-n':'704dd3dad775ee6c1fbab2e3a46b13a9f88f4d0eaf537611363aa443c19ae67e',
 'letter-o':'28e3124faae03d7e79a6a86fee67f32a9593ec198827b566ebe228673057fa30',
 'letter-p':'2e8c3a4425a7c193920c94b9e04bb055a55000830e90f0a8ba7e971163fae428',
 'letter-q':'0bb144d649b6cca77afebcc50c726f88053419cdce0cab16c7046daf2e775005',
 'letter-r':'ff7d067be1d51d0d8ff631d0c6d9b2e3c0e45d5fac64bf87b4223663440c9ce9',
 'letter-s':'09f0c0382de4c49a3aade2e615bf0024ccaf887aa8c46b993baf86d566b0c588',
 'letter-t':'8f80011d7afc1184624e041ad06d015f388ee5a24953194a247580533f33c897',
 'letter-u':'5e04a809078a2fa514328c87061a597e8bac74b3ada2b3605424d2dcfbcf9103',
 'letter-v':'55d68f7fd3338156eeb2b3bca542dd7e676bca8491a53d02cbd80a1896a2cfee',
 'letter-w':'311b5b32e859beeb6492e532fae91afd75734e29309cdda7b742393f40094952',
 'letter-x':'2d2bd02432b9dc9cdc440952a8d15f348969003a4fdbafb2ee6169ccb85fc82f',
 'letter-y':'1b086b32546bf4831e80bed1ec2af582b4f7ac0c61f1f481df9979bfb88dbdc6',
 'letter-z':'62fefcf03fb0566f19509e09aa5cadb16b263e9293f631dead06220e1a94279a'
};
export const LETTERS_AND_ADDITIONAL_FIVE_ZIP_CHECKSUMS:Readonly<Record<string,string>>={...LETTERS_26_ZIP_CHECKSUMS,...ADDITIONAL_FIVE_ZIP_CHECKSUMS};
export const NEW_EIGHT_A_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
 'american-flag':'a3b1471cdc3b840f5c1d2c5425939795340ad235b8343428dbe2758ba2a9e7e4',
 'ant':'ec18cbb65710e63743ea58a9ce1b7172c33cd2221f2ac1dfd24f9ada8a7b8bfc',
 'anpanman':'c09c1e7083ec70935b29c46803e23838ca58e61185e8cbaf1d9cc3ec43771adb',
 'ankylosaurus':'24b9d27f6f057b7630de08e372e88acea378f48d3e4eee6308e6dcb643f56f89',
 'angry-birds':'78fdaa2935247255d3d51d6182b139fa9a90a2aec29724241f869f29f0f63ff4',
 'angel':'759bd68431f408deea1439da2c2afb9899a45b50db2b87a151a4a4bf0714eece',
 'amy-rose':'c0c8a605ad8b856ec4d229cf5a4665c3d164ae47b5feef37fad242342cc33d3e',
 'among-us':'df6a4798eec6a4f0792923f42dc0dbf1e7d223a91058e5c566c470f6ebcc38ab'
};
export const NEW_THIRTEEN_R_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
 'rabbit':'27a6b5c44f0a64a19dc82908ef3324a02facca26decb5ebc50a7857c4ad77f65',
 'religious':'ed0b15e878664f68325fd5b9e709418d39ac73a7a3badc09dc2e9a998244cd56',
 'reindeer':'5294e917d81a807457989d7554f4858bbf8a37592809f6f75bba85d212226d68',
 'red-panda':'ad1c1ae4a94e9d57adf128c3593d03d8d44c5b26e2bdcf5732e6fca6e6dba85c',
 'rat':'4d0582aa2b07a6daf2f20c0344e92ed5179041923a1f96a94f405a50c7d9a9c4',
 'rarity':'a1893d6e46074b6ccf8ceb3e44fae9cf002f690a3d092a08d4bcf05459c02790',
 'ramadan':'29806c35f90cd06978919aa18dfd9e24386cdf87afef6b9d3d5dec6dea05a1a7',
 'rainbow-friends':'407f676849b0d02021c58f70d4aac7148676b5307bb7d27c9bf2618ba90960c3',
 'rainbow-dash':'ee6fe387fc921fe3d21caa9009b9ac7999371777fcb550ec90945e1eadd7ba0b',
 'rainbow':'eff90864d663cfd989b950a162dbb68fee1189a69b708d19eb52ece80f5ef1d5',
 'rain':'ce93dbf606629978564ea8fd20dc95efd407a4afa6905e6b8c16b2201a98d0dd',
 'raccoon':'4ebc7ff2b87b02a0b7ffa49bc2165521dea0f5317e32387b9192f5ca3b44b29b',
 'race-car':'2dc96ca9fa04beb2e306d5fbdd1b3fd0bd3d3dc338aabaf55cb7b032c1893721'
};
export const ALL_52_ZIP_CHECKSUMS:Readonly<Record<string,string>>={...LETTERS_AND_ADDITIONAL_FIVE_ZIP_CHECKSUMS,...NEW_EIGHT_A_ZIP_CHECKSUMS,...NEW_THIRTEEN_R_ZIP_CHECKSUMS};
export const SEASONAL_TEN_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
  "sugar-skull": "4217f71752b8f1481e338ebee58513c1aa4182a79071a57d82ad1d362abcda89",
  "veterans-day": "b65b687197c1488023c2431e85822425a174504f729d185361ed6c4449de69a5",
  "christmas-tree": "70e35eb7dc0810cd91320c4d14818ea0d4a4b6994b9f0d99a3035b1d539ffe97",
  "january": "41c621a2330784751dfe0190636dcc3ece9708e17e5dbdb9c1a8a28e45707421",
  "december": "7084e2a7f5c71fa5cc45bc7560a1484380d46957a187f448ca272f4ca574b0b1",
  "all-souls-day": "f2968e683bfeaa28aa6e4b81529eb34f0a7f9ba478a63eeb992935dd8156b4d7",
  "cheetah": "392e4a7b490aeb70ef968d1722fdd510ce0f938210c85acb37d9beaaa50f8f8e",
  "excavator": "63163b46a248a5953de747671b123ebe564db19657689229664ca1b26d460b55",
  "gingerbread-house": "ea7635ce7f141e8e93b665a005c17615474986b81cb51ff30ff764b0020fbbd3",
  "fall-leaf": "918d5f68776986a33728075612af2396f60f4c25d40d7261e131deddcb63587a"
};
export const PUBLIC_FIGURE_TOPIC_COUNTS:Readonly<Record<string,number>>={'mrbeast':83,'elon-musk':100,'donald-trump':100};
export const PUBLIC_FIGURE_ZIP_CHECKSUMS:Readonly<Record<string,string>>={'mrbeast':'313351aa87beb697db6e44ee860eb2c2a5c7ea53ea26a7fbb901e5d02c62f908','elon-musk':'e8911bbf03ef4da43fd61342fbde7a143be734f7f355b5979c20bb855f2bbe92','donald-trump':'b877e04898603d52cd65a77b1b4db65f4a6d6307b8433c8e67af1fa41f2b5366'};
export function reviewedTopicCount(releaseID:unknown,topic:string){return releaseID===PUBLIC_FIGURE_RELEASE_ID?(PUBLIC_FIGURE_TOPIC_COUNTS[topic]??0):100;}
export function matchesReviewedTopicLineage(releaseID:unknown,topic:string,categoryIDs:unknown){
 if(releaseID!==ALL_52_RELEASE_ID)return true;
 if(!Array.isArray(categoryIDs)||categoryIDs.some(id=>typeof id!=='string'))return false;
 const lineage=categoryLineage(topic);
 return lineage.at(-1)===topic&&lineage.every(id=>categoryIDs.includes(id));
}

export const NUMBER_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
  "number-1-coloring-pages": "05102be36f84a278cb1a34eca282d899252fb8a9daaa3dd66952f4c3da529132",
  "number-2-coloring-pages": "dcf0e56614c2d7c6db71d2ad64580f3e7e37e79daac73c80b8d43008495eb133",
  "number-3-coloring-pages": "380a2921cfde0a307695ee129d9cabae64daa273fe6ecb1df099eb7d5cbc7e24",
  "number-4-coloring-pages": "9c126534346eb876512fa6b3f610f5ded3f168126dae194270187a68ef1047bd",
  "number-5-coloring-pages": "135a3609e4e6348ad603d2f3892ff8e5ef59b7b0fd4960044d0901732dff1c28",
  "number-6-coloring-pages": "dd0deb7397a3679d62160810a7a49ed4ba0b84af4f689a8a02976dd0aae446ff",
  "number-7-coloring-pages": "31cf03038937b56ec64b6ab91f9c75e06430e1c5a1270729412bc67ff887291b",
  "number-8-coloring-pages": "ed02b83fb09bcc930b6775a58cd5add527ae0a70563736e8079221a1ff7cebe2",
  "number-9-coloring-pages": "0c49a8e6a724300c87808cb37c3ff0e8fb533e1e79d7dfcc581a87790093da44",
  "number-10-coloring-pages": "c2644e5e6fa00ae25056ad2a01d95e33c75baae4c8d53b42cdc301a24f09a3d0",
  "number-11-coloring-pages": "82a62d596d8e01d4b112694327778fc8caa3882c644097098f8fc13b9dd9d91d",
  "number-12-coloring-pages": "82d7f3960151fb0657caee53c54319b9d09afbd75bbbda25bf663dbe625e6db1",
  "number-13-coloring-pages": "1342d9f89dac585f16fd8fd2802e8e959cbc6d0b8e2ce84ba4b436a04437770c",
  "number-14-coloring-pages": "6112cf993e0cd685cddcab92f40d789ea60e6943d40cad813cb6b2ba31829245",
  "number-15-coloring-pages": "6adbc96852ed0d8efca7f1ded148c79aa385b5f3cda7ca6775639fe21283ea20",
  "number-99-coloring-pages": "6cc38192cd7d68028177f1474f7a933d5c94ffe7e55b936ce34910f245068176",
  "number-100-coloring-pages": "d028949a3876fb270bd317dedeac17e26ace7fb29b42d30b9d5bea748e761f86",
  "number-101-coloring-pages": "6a072a9175c786ecaf2832c50a3ce6a3ca72260ed799aac7db9471a0c008968c",
  "number-111-coloring-pages": "5fa2ce026ee9149f77d01f084070c2752ed337546e1b1fbc68eb5f8250846c85",
  "number-222-coloring-pages": "d70082d521a1aebc095b4d206f2e0f9f4bdf708334ea18a7c847709e590fc46c",
  "number-333-coloring-pages": "6c881672095ff468b6d5f0991acdb292fa6473d7eec73ff9a7d65ec116b58dca",
  "number-444-coloring-pages": "9f36cd4ce62476c1bd30c9666c6cca18770a6c832cfb685154d351f034d2b0f3",
  "number-555-coloring-pages": "3230d80ee887be9b0fd40d4249998051b2aaf11d629e71ab2f5917a7fc419697",
  "number-666-coloring-pages": "e79471ed6232b3dd39d916d0bb0b40727e1bb7732f85584ceb7db5c9418e42f9",
  "number-777-coloring-pages": "77b4302caee5e03757030a6aba8a7d4f0c776e6608e7fa0a58cc61e5ae00ab9b",
  "number-888-coloring-pages": "9161eee9076e76d29618414669a37e1b0c03c1da3ad05ba99da23a0d58aa8ae5",
  "number-999-coloring-pages": "4b40b34e56552e4f443e2dbaf58108c02a183f8b024b863dcce107137bdd58b2",
  "number-1000-coloring-pages": "20b6b9ba4ee4264b568da963b36bb990d6128eddc55a414c7f844fbd58cad260",
  "number-1001-coloring-pages": "1d5b55be189e7d492bb179c31f1d5d233c575be92e46eeed5ca318d4d3864035",
  "number-2222-coloring-pages": "ab68581672b0d1aa338f81c991920056d93d09ef6e2de07b0511ea25078b8cbc"
};
export const SEVEN_TOPIC_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
 'turtle-coloring-pages':'b97029c20445fc599163d49de0bbfbd46c20e1275380a9a456e9101a32944840',
 'sharks-coloring-pages':'37b790536c965a8cfc600ddc31cea256ac6c09d3ab4da36b79a4f4f2c740783d',
 'trick-or-treat-coloring-pages':'5db488e43238cdcea6f6d34151d5ddfc1ae2ca1fda6e5f7934d15909c20c1ee6',
 'bible-coloring-pages':'96bd9ff7ec0beb093aa40d37d2492d7391f7f07a10de15b5abac3b6079f6bbb8',
 'fnaf-coloring-pages':'92b459e032d483c41a52d9ba49794472b13a476d9e99bde5369dc83c7756e65c',
 'happy-birthday-coloring-pages':'6b2b1865c9ad17e6c928945d685eabe54c922e68abbe93a82e0798b256823501',
 'panda-coloring-pages':'4b5db2b042ae4444f25148c359ce11fd6f20f1844af9be9f8fc13cc5a6a52344'
};
export const COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS:Readonly<Record<string,string>>={
 'labubu':'3d51b82e1f0aaa86f8ae4d72802188a73c84a6c4296dc660cd7d9d9c955ac282',
 'crybaby':'9ba514d8dfb45d7a9b136c4221c97cf66d65b0cc1ba1f4fe2de3273902241f7e',
 'hello-kitty':'9c8548bfdeab4162a2329c473f9dc2da4cf5e1c1761eb8e0fb7cdbcf0b86c204',
 'pompompurin':'3631212e4a58327df7ae5f88e93d8c04421f8e91f28225f41a6327910c6c2306',
 'cinnamoroll':'7801649ee248ee270ebc45c473e526adb317eee688b62c170e5ae5b67cb76693',
 'kuromi':'73309cfc32970a1e22e556e7067d84064c76ed7b8adac9aca32d39018f03ea2b',
 'monchhichi':'f34bdde0406a0883f4c052c4ddc6a9196f5abdbcc5b736e67ebe9f4924e4719a',
 'mofusand':'b564d038221480f57eaa393d44e5f88db6f1df41c8471d3d23f2712ce2cbfb14',
 'chiikawa':'6d3312675f72286564eb2a8540e79c2b020dcfe355bcd102b0e1a2daa1ee10ce',
 'smiski':'d0ce9a02bc85fa484cdc6f1cdecaa83c6de08b8abb5bf25d11029332cf9c6dfc',
 'sonny-angel':'ad16c4332dab269fe483e4bf190bbc9dcd7e35b081a7b8a972868fd947d5d82d',
 'zimomo':'65b91169427e3bbfb293803555260ebdce4c321699afff220cd75be9bb38e53a',
 'pucky':'3d4aacde38239cd9b67e37cc123d036ab8c3ccace2fc6845acef08bbb51f35ef',
 'hacipupu':'e5fc69124bf8ef805a67726efcbd6d15e6b61cc6d864e40f54233f23fb05c399',
 'twinkle-twinkle':'625b110e356396538c13bb9b4275b5683d5ab34af44817355e5f75fb417bd9ff',
 'hirono':'2d0955383e73172748499dc307851b99100b67fce08008b6041804c09734abad',
 'skullpanda':'53601486d4397c24b7c64c3e664628eb8c8757d2fdf82979a647efd11c04d7d4'
};
export function reviewedReleaseScope(id?:unknown){
 if(id===undefined)return {collections:24,designs:2400,topics:null as readonly string[]|null};
 if(id===FOLLOWUP_RELEASE_ID)return {collections:3,designs:300,topics:['descendants-coloring-pages','squishy-coloring-pages','k-pop-demon-hunters-coloring-pages'] as readonly string[]};
 if(id===SEVEN_TOPIC_RELEASE_ID)return {collections:7,designs:700,topics:Object.keys(SEVEN_TOPIC_ZIP_CHECKSUMS) as readonly string[]};
 if(id===NUMBER_RELEASE_ID)return {collections:30,designs:3000,topics:Object.keys(NUMBER_ZIP_CHECKSUMS) as readonly string[]};
 if(id===SEASONAL_TEN_RELEASE_ID)return {collections:10,designs:1000,topics:Object.keys(SEASONAL_TEN_ZIP_CHECKSUMS) as readonly string[]};
 if(id===LETTERS_26_RELEASE_ID)return {collections:26,designs:2600,topics:Object.keys(LETTERS_26_ZIP_CHECKSUMS) as readonly string[]};
 if(id===ADDITIONAL_FIVE_RELEASE_ID)return {collections:5,designs:500,topics:Object.keys(ADDITIONAL_FIVE_ZIP_CHECKSUMS) as readonly string[]};
 if(id===LETTERS_AND_ADDITIONAL_FIVE_RELEASE_ID)return {collections:31,designs:3100,topics:Object.keys(LETTERS_AND_ADDITIONAL_FIVE_ZIP_CHECKSUMS) as readonly string[]};
 if(id===ALL_52_RELEASE_ID)return {collections:52,designs:5200,topics:Object.keys(ALL_52_ZIP_CHECKSUMS) as readonly string[]};
 if(id===PUBLIC_FIGURE_RELEASE_ID)return {collections:3,designs:283,topics:Object.keys(PUBLIC_FIGURE_TOPIC_COUNTS) as readonly string[]};
 if(id===COLLECTIBLE_CHARACTER_RELEASE_ID)return {collections:17,designs:1700,topics:Object.keys(COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS) as readonly string[]};
 throw Error('Unknown owner-authorized release scope');
}
export function matchesReviewedReleaseScope(release:{id?:unknown;collections?:unknown;designs?:unknown}){
 try{const scope=reviewedReleaseScope(release.id);return release.collections===scope.collections&&release.designs===scope.designs;}catch{return false;}
}
export function matchesReviewedSourceArchives(release:{release_id?:unknown;source_zip_sha256?:unknown;source_zip_sha256s?:unknown}){
 if(release.release_id===undefined)return true;
 if(release.release_id===FOLLOWUP_RELEASE_ID)return release.source_zip_sha256==='d45545c97ec95111b93c311321c0c886482cc59e2a1d68d5262bf983b9060896';
 if(release.release_id===NUMBER_RELEASE_ID){
  if(!release.source_zip_sha256s||typeof release.source_zip_sha256s!=='object')return false;
  const actual=release.source_zip_sha256s as Record<string,unknown>;return Object.keys(actual).length===30&&Object.entries(NUMBER_ZIP_CHECKSUMS).every(([topic,hash])=>actual[topic]===hash);
 }
 if(release.release_id===SEASONAL_TEN_RELEASE_ID){const actual=release.source_zip_sha256s as Record<string,unknown>|undefined;return !!actual&&Object.keys(actual).length===10&&Object.entries(SEASONAL_TEN_ZIP_CHECKSUMS).every(([topic,sha])=>actual[topic]===sha);}
 if(release.release_id===LETTERS_26_RELEASE_ID){const actual=release.source_zip_sha256s as Record<string,unknown>|undefined;return !!actual&&Object.keys(actual).length===26&&Object.entries(LETTERS_26_ZIP_CHECKSUMS).every(([topic,sha])=>actual[topic]===sha);}
 if(release.release_id===ADDITIONAL_FIVE_RELEASE_ID){const actual=release.source_zip_sha256s as Record<string,unknown>|undefined;return !!actual&&Object.keys(actual).length===5&&Object.entries(ADDITIONAL_FIVE_ZIP_CHECKSUMS).every(([topic,sha])=>actual[topic]===sha);}
 if(release.release_id===LETTERS_AND_ADDITIONAL_FIVE_RELEASE_ID){const actual=release.source_zip_sha256s as Record<string,unknown>|undefined;return !!actual&&Object.keys(actual).length===31&&Object.entries(LETTERS_AND_ADDITIONAL_FIVE_ZIP_CHECKSUMS).every(([topic,sha])=>actual[topic]===sha);}
 if(release.release_id===ALL_52_RELEASE_ID){const actual=release.source_zip_sha256s as Record<string,unknown>|undefined;return !!actual&&Object.keys(actual).length===52&&Object.entries(ALL_52_ZIP_CHECKSUMS).every(([topic,sha])=>actual[topic]===sha);}
 if(release.release_id===PUBLIC_FIGURE_RELEASE_ID){const actual=release.source_zip_sha256s as Record<string,unknown>|undefined;return !!actual&&Object.keys(actual).length===3&&Object.entries(PUBLIC_FIGURE_ZIP_CHECKSUMS).every(([topic,sha])=>actual[topic]===sha);}
 if(release.release_id===COLLECTIBLE_CHARACTER_RELEASE_ID){
  if(!release.source_zip_sha256s||typeof release.source_zip_sha256s!=='object')return false;
  const actual=release.source_zip_sha256s as Record<string,unknown>,expected=COLLECTIBLE_CHARACTER_ZIP_CHECKSUMS;return Object.keys(actual).length===Object.keys(expected).length&&Object.entries(expected).every(([topic,hash])=>actual[topic]===hash);
 }
 if(release.release_id!==SEVEN_TOPIC_RELEASE_ID||!release.source_zip_sha256s||typeof release.source_zip_sha256s!=='object')return false;
 const actual=release.source_zip_sha256s as Record<string,unknown>,expected=SEVEN_TOPIC_ZIP_CHECKSUMS;
 return Object.keys(actual).length===Object.keys(expected).length&&Object.entries(expected).every(([topic,hash])=>actual[topic]===hash);
}

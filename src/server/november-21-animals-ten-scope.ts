export const NOVEMBER_21_ANIMALS_RELEASE_ID = 'november-21-animals-ten-20261121';

export const NOVEMBER_21_ANIMALS_ZIP_SHA256S: Readonly<Record<string, string>> = {
  "fennec-fox": "105d2871cb6c47e2427e91638f10f037ce74651f3b4df1375893e03ba6f0e239",
  "gharial": "612cc4ae03e5f9800a3fc84e244a2d7fcfc569acdaf34ac973472637ae7e4e1d",
  "musk-ox": "639bff64f30fc340391e5710af74fc39c07fb459049b834ee1ea8a8ef8e177a1",
  "cuttlefish": "9269226fd9edb7b2320b7cc144b58312507695a80de4b60617c245fe1411c035",
  "dugong": "2e7a11dbd025f71c03a502195d82b1e302304cf714f23821239b3f03dd19caef",
  "secretary-bird": "2e07d49491312c0c6496832d3a4635d330cf234bce169b4d834d3fd8e0a4014c",
  "shoebill": "4fc8115d3de7f31944662e0535f7f377b9b8d085d7495b183673cb7ad94636ca",
  "binturong": "74b964b270ec59b8cc567d6856c50a83cd034e09ef1970e7df96950691a9b2f7",
  "tarsier": "f4c6f4eb6a74400624a76633cebb01d66831441dc4731953beba8aa381a9bb12",
  "aardvark": "aa8a0b0bb1893a0264f356cd7c86351947bfe2678ba619975a8cf9bd875e916a"
};

export const NOVEMBER_21_ANIMALS_TOPIC_COUNTS: Readonly<Record<string, number>> = Object.fromEntries(
  Object.keys(NOVEMBER_21_ANIMALS_ZIP_SHA256S).map(topic => [topic, 100]),
);

export function november21AnimalScope(id: unknown): readonly string[] | undefined {
  if (id === NOVEMBER_21_ANIMALS_RELEASE_ID) return Object.keys(NOVEMBER_21_ANIMALS_TOPIC_COUNTS);
  if (typeof id !== 'string' || !id.startsWith(NOVEMBER_21_ANIMALS_RELEASE_ID + '-')) return undefined;
  const topic = id.slice(NOVEMBER_21_ANIMALS_RELEASE_ID.length + 1);
  return Object.hasOwn(NOVEMBER_21_ANIMALS_TOPIC_COUNTS, topic) ? [topic] : undefined;
}

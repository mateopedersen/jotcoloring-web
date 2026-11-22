export const NOVEMBER_23_ID = 'november-23-five-topics-20261123';
export const NOVEMBER_23_ZIP_SHA256S: Readonly<Record<string, string>> = {
  "christmas-stocking": "5d07b630a34c31bfa073dbfe85a27f636bb981d09c1ef89833c39f5e25f3c6ac",
  "capybara": "1845ac46b484670fddf81fa06545725d85108170b4840ed4845873a863f85a0e",
  "dirt-bike": "a34d1b725ebe49d2bd15414c1cd8258ab017c269d58a156c64f56d41102067b5",
  "mothers-day": "74e0c232257edc6a90c637ed213fc099739290f355e01e27d667dac1e3b18274",
  "67": "231afed64aac5a80275609d929a2cd59d6819fd867c83f7900d31df9293ddad5"
};
export const NOVEMBER_23_TOPICS = Object.keys(NOVEMBER_23_ZIP_SHA256S);
export const NOVEMBER_23_COUNTS: Readonly<Record<string, number>> = Object.fromEntries(
  NOVEMBER_23_TOPICS.map(topic => [topic, 100]),
);

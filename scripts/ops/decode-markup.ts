const characters: Record<string, string> = {
  amp: '&',
  apos: "'",
  '#39': "'",
  gt: '>',
  lt: '<',
  quot: '"',
};

export function decodeMarkup(text: string) {
  return text.replace(/&(amp|apos|#39|gt|lt|quot);/g, (_, name: string) => characters[name]);
}

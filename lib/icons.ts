const wikiFile = (fileName: string) =>
  `https://oldschool.runescape.wiki/w/Special:FilePath/${encodeURIComponent(fileName).replace(/%20/g, "_")}`;

export function itemIcon(fileName: string) {
  return wikiFile(fileName);
}

export function runeLiteItemIcon(itemId: number) {
  return `https://static.runelite.net/cache/item/icon/${itemId}.png`;
}

export function skillIcon(skill: string) {
  return wikiFile(`${skill} icon.png`);
}

export function questIcon() {
  return wikiFile("Quest point icon.png");
}

const wikiFile = (fileName: string) =>
  `https://oldschool.runescape.wiki/w/Special:FilePath/${encodeURIComponent(fileName).replace(/%20/g, "_")}`;

export function itemIcon(fileName: string) {
  return wikiFile(fileName);
}

export function skillIcon(skill: string) {
  return wikiFile(`${skill} icon.png`);
}

export function questIcon() {
  return wikiFile("Quest point icon.png");
}

import type { CollectionLogSection, KillCountSnapshot } from "./types";

function normalized(value: string) {
  return value.trim().toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

const sectionAliases: Record<string, string[]> = {
  "gauntlet": ["gauntlet", "corrupted gauntlet"],
  "callisto and artio": ["callisto", "artio"],
  "vet ion and calvar ion": ["vet ion", "calvar ion"],
  "venenatis and spindel": ["venenatis", "spindel"],
  "dagannoth kings": ["dagannoth prime", "dagannoth rex", "dagannoth supreme"],
};

export function killCountsForCollectionSection(section: Pick<CollectionLogSection, "name" | "category">, killCounts: KillCountSnapshot[]) {
  if (section.category !== "Bosses" && section.category !== "Raids") return [];
  const sectionName = normalized(section.name);
  const aliases = (sectionAliases[sectionName] ?? [section.name]).map(normalized);
  return killCounts.filter((kill) => {
    const source = normalized(kill.sourceName);
    return aliases.some((alias) => source === alias || source.startsWith(`${alias} `));
  }).sort((a, b) => a.sourceName.localeCompare(b.sourceName));
}

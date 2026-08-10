import { describe, expect, it } from "vitest";
import { canonicalQuestRows, isMainGameCatalogEntry, normalizeInfoboxItems, parseLuaQuestRequirements, parseQuestItems, parseRarityDenominator, parseSkillRequirements } from "@/lib/wiki/catalog";

describe("OSRS Wiki normalization", () => {
  it("normalizes explicit quest item quantities", () => {
    const items = parseQuestItems("*8 [[oak plank]]s\n*10 [[swamp paste]]\n*A [[hammer]]\n*Runes for 3 [[Fire Wave]] spells '''or''' 3 [[Fire Surge]] spells");
    expect(items[0]).toMatchObject({ name: "oak plank", quantity: 8, manual: false });
    expect(items[2]).toMatchObject({ name: "hammer", quantity: 1 });
    expect(items[3].manual).toBe(true);
  });

  it("reads structured skill data embedded in quest requirements", () => {
    const skills = parseSkillRequirements('<span data-skill="Magic" data-level="75">75 Magic</span>');
    expect(skills).toEqual([{ skill: "Magic", level: 75 }]);
  });

  it("converts exact drop fractions to one-in denominators", () => {
    expect(parseRarityDenominator("1/3,000")).toBe(3000);
    expect(parseRarityDenominator("18/500")).toBeCloseTo(27.777777, 5);
    expect(parseRarityDenominator("Always")).toBe(1);
    expect(parseRarityDenominator("Varies")).toBeNull();
  });

  it("parses canonical quest module blocks", () => {
    const source = `local questReqs = {
      ['Test Quest'] = {
        ['quests'] = {'First Quest', 'Hero\\'s Quest'},
        ['skills'] = {{'Magic', 42}, {'Prayer', 31, 'ironman'}}
      },
    }`;
    expect(parseLuaQuestRequirements(source)[0]).toMatchObject({
      quest: "Test Quest", prerequisites: ["First Quest", "Hero's Quest"],
      skills: [{ skill: "Magic", level: 42, flags: [] }, { skill: "Prayer", level: 31, flags: ["ironman"] }]
    });
  });

  it("keeps the aggregate record when a Wiki quest page emits subquest rows", () => {
    const rows = canonicalQuestRows([
      { page_name: "Recipe for Disaster/Full guide", json: "short" },
      { page_name: "Recipe for Disaster/Full guide", json: "the complete aggregate record" },
      { page_name: "Cook's Assistant", json: "unique" },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.page_name === "Recipe for Disaster/Full guide")?.json).toBe("the complete aggregate record");
  });

  it("imports untradeable item variants from the full item bucket", () => {
    expect(normalizeInfoboxItems([{
      page_name: "Pet dagannoth supreme", item_name: "Pet dagannoth supreme",
      item_id: ["12643", "12644"], image: ["File:Pet dagannoth supreme.png"],
      is_members_only: true, tradeable: false, examine: "A tiny Dagannoth Supreme.",
    }])).toEqual([
      { item_id: 12643, name: "Pet dagannoth supreme", icon_file: "Pet dagannoth supreme.png", examine: "A tiny Dagannoth Supreme.", members: true },
      { item_id: 12644, name: "Pet dagannoth supreme", icon_file: "Pet dagannoth supreme.png", examine: "A tiny Dagannoth Supreme.", members: true },
    ]);
  });

  it("rejects seasonal catalog rows without hiding similarly named main-game content", () => {
    expect(isMainGameCatalogEntry("Dagannoth Rex (Deadman)", "Morrigan's javelin (Deadman Mode)")).toBe(false);
    expect(isMainGameCatalogEntry("Echo Hunllef (Raging Echoes)")).toBe(false);
    expect(isMainGameCatalogEntry("Trailblazer boots (t1)")).toBe(false);
    expect(isMainGameCatalogEntry("Salarin the twisted", "Twisted bow")).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { parseLuaQuestRequirements, parseQuestItems, parseRarityDenominator, parseSkillRequirements } from "@/lib/wiki/catalog";

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
});

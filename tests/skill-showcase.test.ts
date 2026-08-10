import { describe, expect, it } from "vitest";
import { skillShowcaseKey, sortedSkills, visibleShowcaseSkills } from "@/lib/skill-showcase";
import type { SkillSnapshot } from "@/lib/types";

const skills: SkillSnapshot[] = [
  { skill: "Magic", level: 82, xp: 2_421_087 },
  { skill: "Attack", level: 75, xp: 1_210_421 },
  { skill: "Construction", level: 74, xp: 1_185_000 },
];

describe("skill showcase selection", () => {
  it("normalizes skill keys and follows canonical skill order", () => {
    expect(skillShowcaseKey("  Rune_Craft  ")).toBe("rune craft");
    expect(sortedSkills(skills).map((skill) => skill.skill)).toEqual(["Attack", "Magic", "Construction"]);
  });

  it("shows either every stat or only explicitly selected stats", () => {
    expect(visibleShowcaseSkills(skills, { all: true, skills: [] })).toHaveLength(3);
    expect(visibleShowcaseSkills(skills, { all: false, skills: ["magic", "construction"] }).map((skill) => skill.skill))
      .toEqual(["Magic", "Construction"]);
    expect(visibleShowcaseSkills(skills, { all: false, skills: [] })).toEqual([]);
  });
});

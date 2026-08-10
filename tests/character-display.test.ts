import { describe, expect, it } from "vitest";
import { accountTypeLabel, combatLevelFromSkills, resolvedCombatLevel } from "@/lib/character-display";
import type { SkillSnapshot } from "@/lib/types";

function combatSkills(levels: Partial<Record<string, number>> = {}): SkillSnapshot[] {
  return ["Attack", "Strength", "Defence", "Hitpoints", "Prayer", "Ranged", "Magic"].map((skill) => ({
    skill,
    level: levels[skill] ?? 99,
    xp: 0,
  }));
}

describe("character display metadata", () => {
  it("calculates canonical OSRS combat levels from synced skills", () => {
    expect(combatLevelFromSkills(combatSkills())).toBe(126);
    expect(combatLevelFromSkills(combatSkills({
      Attack: 1, Strength: 1, Defence: 1, Hitpoints: 10, Prayer: 1, Ranged: 1, Magic: 1,
    }))).toBe(3);
  });

  it("replaces a stale default combat level with the skill-derived level", () => {
    expect(resolvedCombatLevel(3, combatSkills())).toBe(126);
  });

  it("recognizes a successful sync even before account mode metadata arrives", () => {
    expect(accountTypeLabel("Unknown", "2026-08-10T20:00:00Z")).toBe("RuneLite synced");
    expect(accountTypeLabel("Unknown")).toBe("Awaiting RuneLite");
    expect(accountTypeLabel("Ironman", "2026-08-10T20:00:00Z")).toBe("Ironman");
  });
});

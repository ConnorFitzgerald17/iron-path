import { describe, expect, it } from "vitest";
import { bankedXp, dropProbability, grindProgress, levelForXp, questReadiness, xpForLevel } from "@/lib/calculations";
import { demoProfile } from "@/lib/demo-data";

describe("OSRS progress calculations", () => {
  it("uses canonical level thresholds", () => {
    expect(xpForLevel(70)).toBe(737627);
    expect(levelForXp(737627)).toBe(70);
    expect(levelForXp(13034431)).toBe(99);
  });

  it("combines starting and observed KC without changing drop odds math", () => {
    const goal = demoProfile.goals.find((item) => item.kind === "grind")!;
    const progress = grindProgress(goal);
    expect(progress.kc).toBe(2467);
    expect(progress.probability).toBeCloseTo(dropProbability(2467, 3000), 8);
  });

  it("calculates quest readiness from authoritative skills and owned items", () => {
    const goal = demoProfile.goals.find((item) => item.kind === "quest")!;
    const skills = Object.fromEntries(demoProfile.skills.map((skill) => [skill.skill, skill.level]));
    const progress = questReadiness(goal, demoProfile.items, skills);
    expect(progress.total).toBeGreaterThan(10);
    expect(progress.ready).toBeLessThan(progress.total);
  });

  it("projects banked XP without consuming missing secondaries", () => {
    const goal = demoProfile.goals.find((item) => item.kind === "banked_xp")!;
    const progress = bankedXp(goal);
    expect(progress.banked).toBe(149422);
    expect(progress.projectedLevel).toBeGreaterThanOrEqual(goal.currentLevel);
  });
});

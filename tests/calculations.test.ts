import { describe, expect, it } from "vitest";
import { bankedXp, calculateBankedPlan, dropProbability, grindProgress, levelForXp, questReadiness, xpForLevel } from "@/lib/calculations";
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

  it("feeds intermediate outputs through a banked resource chain", () => {
    const items = [
      { itemId: 207, name: "Grimy ranarr weed", quantity: 1, container: "bank" as const },
      { itemId: 227, name: "Vial of water", quantity: 1, container: "bank" as const },
      { itemId: 231, name: "Snape grass", quantity: 1, container: "bank" as const },
    ];
    const settings = { selectedMethodIds: ["clean-ranarr", "prayer-potion"], includeOutputs: true, respectLevels: true, showSecondaries: true };
    expect(calculateBankedPlan("Herblore", 50, 101333, 60, settings, items, "Ironman").banked).toBe(95);
    expect(calculateBankedPlan("Herblore", 50, 101333, 60, { ...settings, includeOutputs: false }, items, "Ironman").banked).toBe(7);
  });

  it("caps shared supplies and accepts only one alternative family", () => {
    const items = [{ itemId: 536, name: "Dragon bones", quantity: 10, container: "bank" as const }];
    const plan = calculateBankedPlan("Prayer", 70, 737627, 77, {
      selectedMethodIds: ["dragon-bones-altar", "dragon-bones-bury"], includeOutputs: true, respectLevels: true, showSecondaries: true,
    }, items, "Ironman");
    expect(plan.banked).toBe(2520);
    expect(plan.methods).toHaveLength(1);
  });

  it("does not count bank supplies for an Ultimate Ironman", () => {
    const plan = calculateBankedPlan("Firemaking", 75, 1210421, 80, {
      selectedMethodIds: ["burn-yew"], includeOutputs: true, respectLevels: true, showSecondaries: true,
    }, [{ itemId: 1515, name: "Yew logs", quantity: 100, container: "bank" }], "Ultimate Ironman");
    expect(plan.banked).toBe(0);
  });
});

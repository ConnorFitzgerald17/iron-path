import { describe, expect, it } from "vitest";
import { demoProfile, quickAddGoals } from "@/lib/demo-data";
import { goalSchema } from "@/lib/server/goal-schema";
import { goalToRow, goalToUpdateRow } from "@/lib/server/profile";

describe("goal API schema", () => {
  it("accepts every bundled MVP goal", () => {
    for (const goal of [...demoProfile.goals, ...quickAddGoals]) {
      expect(goalSchema.safeParse(goal).success, goal.title).toBe(true);
    }
  });

  it("rejects unsafe manual values", () => {
    const grind = structuredClone(demoProfile.goals.find((goal) => goal.kind === "grind")!);
    grind.startingKc = -1;
    expect(goalSchema.safeParse(grind).success).toBe(false);
  });

  it("accepts quest-point requirements above the skill level cap", () => {
    const quest = structuredClone(demoProfile.goals.find((goal) => goal.kind === "quest")!);
    quest.requirements.push({ skill: "Quest points", level: 200 });
    expect(goalSchema.safeParse(quest).success).toBe(true);
  });

  it("accepts long descriptions from the live Wiki catalog", () => {
    const quest = structuredClone(demoProfile.goals.find((goal) => goal.kind === "quest")!);
    quest.description = "A".repeat(1_673);
    expect(goalSchema.safeParse(quest).success).toBe(true);
  });

  it("accepts active and completed goals but rejects unknown statuses", () => {
    const goal = structuredClone(demoProfile.goals[0]);
    expect(goalSchema.safeParse({ ...goal, status: "active" }).success).toBe(true);
    expect(goalSchema.safeParse({ ...goal, status: "complete" }).success).toBe(true);
    expect(goalSchema.safeParse({ ...goal, status: "paused" }).success).toBe(false);
  });

  it("keeps status out of ordinary goal-detail updates", () => {
    const goal = { ...structuredClone(demoProfile.goals[0]), status: "complete" as const };
    expect(goalToRow(goal).status).toBe("complete");
    expect(goalToUpdateRow(goal)).not.toHaveProperty("status");
  });

  it("accepts XP-derived skill goals and persists their derived status", () => {
    const goal = {
      id: "skill-smithing-70", kind: "skill" as const, title: "Train 70 Smithing", skill: "Smithing",
      targetLevel: 70, targetXp: 737627, currentLevel: 69, currentXp: 668051,
      sourceGoals: [{ goalId: "quest-ds2", title: "Dragon Slayer II", requiredLevel: 70 }], public: false,
    };
    expect(goalSchema.safeParse(goal).success).toBe(true);
    expect(goalToRow(goal).status).toBe("active");
    expect(goalToUpdateRow({ ...goal, currentXp: 737627 })).toHaveProperty("status", "complete");
  });
});

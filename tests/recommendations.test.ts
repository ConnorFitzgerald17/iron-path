import { describe, expect, it } from "vitest";
import { demoProfile } from "@/lib/demo-data";
import { questRecommendations, skillGoalFromRecommendation } from "@/lib/recommendations";

describe("quest blocker recommendations", () => {
  it("ranks prerequisite quests before skill and item blockers", () => {
    const profile = structuredClone(demoProfile);
    const quest = profile.goals.find((goal) => goal.kind === "quest")!;
    quest.prerequisites[0].state = "not_started";
    const rows = questRecommendations(profile);
    expect(rows[0]).toMatchObject({ kind: "quest", title: "Legends' Quest" });
    expect(rows.some((row) => row.kind === "skill" && row.skill === "Smithing")).toBe(true);
    expect(rows.some((row) => row.kind === "item" && row.itemName === "Goutweed")).toBe(true);
  });

  it("creates a level grind with quest provenance and no banked XP by default", () => {
    const recommendation = questRecommendations(demoProfile).find((row) => row.kind === "skill")!;
    const goal = skillGoalFromRecommendation(recommendation, demoProfile);
    expect(goal.kind).toBe("skill");
    expect(goal.targetXp).toBeGreaterThan(goal.currentXp);
    expect(goal.sourceGoals[0].goalId).toBe(recommendation.sourceGoalId);
    expect(goal.bankedPlan).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { collectionLogAttributionDetail, collectionLogProgress } from "@/lib/achievements";

describe("achievement presentation", () => {
  it("formats total Collection Log progress", () => {
    expect(collectionLogProgress(623, 1921)).toBe("623 / 1,921 unlocked (32.4%)");
  });

  it("handles an empty log without dividing by zero", () => {
    expect(collectionLogProgress(0, 0)).toBe("0 / 0 unlocked (0.0%)");
  });

  it("describes the Collection Log section without claiming an observed drop source", () => {
    expect(collectionLogAttributionDetail("Tombs of Amascut")).toBe("Collection Log section: Tombs of Amascut");
    expect(collectionLogAttributionDetail()).toBe("Added to the Collection Log");
  });

  it("prefers an exact matching RuneLite loot source", () => {
    expect(collectionLogAttributionDetail("Abyssal Sire", "Abyssal Sire")).toBe("Loot source: Abyssal Sire");
  });
});

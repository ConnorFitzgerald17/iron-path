import { describe, expect, it } from "vitest";
import { collectionLogProgress } from "@/lib/achievements";

describe("achievement presentation", () => {
  it("formats total Collection Log progress", () => {
    expect(collectionLogProgress(623, 1921)).toBe("623 / 1,921 unlocked (32.4%)");
  });

  it("handles an empty log without dividing by zero", () => {
    expect(collectionLogProgress(0, 0)).toBe("0 / 0 unlocked (0.0%)");
  });
});

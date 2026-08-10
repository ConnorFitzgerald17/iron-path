import { describe, expect, it } from "vitest";
import { collectionLogSectionSchema } from "@/lib/server/collection-log-schema";

describe("collection log ingestion", () => {
  it("accepts a complete authoritative section", () => {
    expect(collectionLogSectionSchema.safeParse({
      key: "bosses-barrows-chests", category: "Bosses", name: "Barrows Chests",
      obtainedCount: 1, totalCount: 2, capturedAt: "2026-08-10T18:00:00Z",
      slots: [
        { itemId: 4708, quantity: 1, obtained: true, slotOrder: 0 },
        { itemId: 4712, quantity: 0, obtained: false, slotOrder: 1 },
      ],
    }).success).toBe(true);
  });

  it("rejects malformed or oversized slot payloads", () => {
    expect(collectionLogSectionSchema.safeParse({
      key: "boss", category: "Bosses", name: "Boss", obtainedCount: 0, totalCount: 1,
      capturedAt: "not-a-date", slots: [{ itemId: -1, quantity: 0, obtained: false, slotOrder: 0 }],
    }).success).toBe(false);
  });
});

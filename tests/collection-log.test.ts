import { describe, expect, it } from "vitest";
import { collectionLogShowcaseSummary } from "@/components/collection-log-showcase";
import { collectionLogSectionSchema } from "@/lib/server/collection-log-schema";
import type { CollectionLogSection } from "@/lib/types";

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

  it("totals public sections without exposing private section progress", () => {
    const sections: CollectionLogSection[] = [
      {
        key: "public", category: "Bosses", name: "Public boss", obtainedCount: 3, totalCount: 10,
        capturedAt: "2026-08-10T18:00:00Z", public: true, displayMode: "summary", sortOrder: 0, slots: [],
      },
      {
        key: "private", category: "Bosses", name: "Private boss", obtainedCount: 8, totalCount: 12,
        capturedAt: "2026-08-10T18:00:00Z", public: false, displayMode: "full", sortOrder: 1,
        slots: [{ itemId: 1, name: "Pinned item", quantity: 1, obtained: true, slotOrder: 0, public: true }],
      },
    ];

    const summary = collectionLogShowcaseSummary(sections);

    expect(summary.obtainedCount).toBe(3);
    expect(summary.totalCount).toBe(10);
    expect(summary.visibleSections.map((section) => section.key)).toEqual(["public"]);
    expect(summary.pinned.map((slot) => slot.name)).toEqual(["Pinned item"]);
  });
});

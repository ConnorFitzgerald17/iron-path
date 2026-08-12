import { describe, expect, it } from "vitest";
import { collectionLogShowcaseSummary } from "@/components/collection-log-showcase";
import { killCountsForCollectionSection } from "@/lib/kill-count-showcase";
import { collectionLogSectionSchema, collectionLogSyncSchema } from "@/lib/server/collection-log-schema";
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

describe("collection log kill counts", () => {
  it("attaches boss KC to the matching showcased log", () => {
    const counts = killCountsForCollectionSection({ name: "Abyssal Sire", category: "Bosses" }, [
      { sourceName: "Abyssal Sire", count: 162, capturedAt: "2026-08-11T20:00:00Z" },
      { sourceName: "Zulrah", count: 50, capturedAt: "2026-08-11T20:00:00Z" },
    ]);
    expect(counts.map((count) => `${count.sourceName}:${count.count}`)).toEqual(["Abyssal Sire:162"]);
  });

  it("attaches every raid mode completion count to its log", () => {
    const counts = killCountsForCollectionSection({ name: "Tombs of Amascut", category: "Raids" }, [
      { sourceName: "Tombs of Amascut", count: 131, capturedAt: "2026-08-11T20:00:00Z" },
      { sourceName: "Tombs of Amascut (Entry)", count: 27, capturedAt: "2026-08-11T20:00:00Z" },
      { sourceName: "Tombs of Amascut (Expert)", count: 4, capturedAt: "2026-08-11T20:00:00Z" },
    ]);
    expect(counts).toHaveLength(3);
  });
});

describe("collection log manual sync payload", () => {
  it("accepts one batch with native overview recents", () => {
    expect(collectionLogSyncSchema.safeParse({
      capturedAt: "2026-08-11T20:00:00Z",
      recentItemIds: [13262, 4151],
      globalObtainedCount: 460,
      globalTotalCount: 1712,
      sections: [{
        key: "bosses-abyssal-sire", category: "Bosses", name: "Abyssal Sire",
        obtainedCount: 1, totalCount: 2, capturedAt: "2026-08-11T20:00:00Z",
        slots: [
          { itemId: 13262, quantity: 1, obtained: true, slotOrder: 0 },
          { itemId: 7979, quantity: 0, obtained: false, slotOrder: 1 },
        ],
      }],
    }).success).toBe(true);
  });

  it("rejects incomplete or impossible global totals", () => {
    const payload = {
      capturedAt: "2026-08-11T20:00:00Z",
      sections: [{
        key: "boss", category: "Bosses", name: "Boss", obtainedCount: 0, totalCount: 1,
        capturedAt: "2026-08-11T20:00:00Z", slots: [],
      }],
    };
    expect(collectionLogSyncSchema.safeParse({ ...payload, globalObtainedCount: 460 }).success).toBe(false);
    expect(collectionLogSyncSchema.safeParse({ ...payload, globalObtainedCount: 2, globalTotalCount: 1 }).success).toBe(false);
  });
});

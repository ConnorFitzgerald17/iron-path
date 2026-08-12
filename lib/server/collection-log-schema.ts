import { z } from "zod";

export const collectionLogSectionSchema = z.object({
  key: z.string().min(1).max(160),
  category: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  obtainedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  capturedAt: z.string().datetime(),
  slots: z.array(z.object({
    itemId: z.number().int().positive(),
    quantity: z.number().int().nonnegative(),
    obtained: z.boolean(),
    slotOrder: z.number().int().nonnegative(),
  })).max(200),
});

export const collectionLogSyncSchema = z.object({
  capturedAt: z.string().datetime(),
  sections: z.array(collectionLogSectionSchema).min(1).max(500),
  recentItemIds: z.array(z.number().int().positive()).max(10).default([]),
});

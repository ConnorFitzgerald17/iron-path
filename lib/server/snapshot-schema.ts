import { z } from "zod";

export const snapshotSchema = z.object({
  capturedAt: z.string().datetime(),
  characterName: z.string().min(1).max(12),
  accountType: z.enum(["Normal", "Ironman", "Hardcore Ironman", "Ultimate Ironman", "Group Ironman", "Hardcore Group Ironman"]).optional(),
  combatLevel: z.number().int().min(3).max(126).optional(),
  skills: z.array(z.object({ skill: z.string(), level: z.number().int().min(1).max(126), xp: z.number().int().nonnegative() })).max(40),
  quests: z.array(z.object({ quest: z.string(), state: z.enum(["not_started", "in_progress", "finished"]) })).max(300),
  items: z.array(z.object({ itemId: z.number().int().positive(), quantity: z.number().int().nonnegative(), container: z.enum(["bank", "inventory", "equipment"]) })).max(2000),
  killCounts: z.array(z.object({
    sourceName: z.string().min(1).max(120),
    count: z.number().int().nonnegative(),
    capturedAt: z.string().datetime(),
  })).max(200).default([]),
});

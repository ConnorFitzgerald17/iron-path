import { z } from "zod";

const publicFields = {
  id: z.string().optional(),
  title: z.string().trim().min(1).max(100),
  public: z.boolean().default(false),
  status: z.enum(["active", "complete"]).default("active"),
};

export const goalSchema = z.discriminatedUnion("kind", [
  z.object({
    ...publicFields,
    kind: z.literal("quest"),
    description: z.string().max(10_000).default(""),
    wikiUrl: z.string().url(),
    state: z.enum(["not_started", "in_progress", "finished"]).default("not_started"),
    requirements: z.array(z.object({ skill: z.string(), level: z.number().int().min(1).max(999), boostable: z.boolean().optional() })).max(40),
    prerequisites: z.array(z.object({ name: z.string(), state: z.enum(["not_started", "in_progress", "finished"]) })).max(100),
    items: z.array(z.object({ id: z.string(), itemId: z.number().int().positive().optional(), name: z.string(), quantity: z.number().int().nonnegative(), icon: z.string().url().optional(), manual: z.boolean().optional(), note: z.string().max(5_000).optional(), complete: z.boolean().optional() })).max(100),
  }),
  z.object({
    ...publicFields,
    kind: z.literal("grind"),
    monster: z.string().min(1).max(100),
    npcIds: z.array(z.number().int()).max(100),
    targetItemId: z.number().int().positive(),
    targetItemName: z.string().min(1),
    targetIcon: z.string().url().optional(),
    dropRate: z.number().positive(),
    startingKc: z.number().int().nonnegative(),
    observedKc: z.number().int().nonnegative(),
    drops: z.array(z.object({ itemId: z.number().int().positive(), name: z.string(), quantity: z.number().int().nonnegative(), rarity: z.string(), icon: z.string().url().optional(), public: z.boolean(), source: z.enum(["runelite", "manual"]) })).max(100),
  }),
  z.object({
    ...publicFields,
    kind: z.literal("banked_xp"),
    skill: z.string().min(1),
    targetLevel: z.number().int().min(2).max(99),
    currentLevel: z.number().int().min(1).max(99),
    currentXp: z.number().int().nonnegative(),
    includeOutputs: z.boolean(),
    respectLevels: z.boolean(),
    showSecondaries: z.boolean(),
    activities: z.array(z.object({ id: z.string(), label: z.string(), inputItemId: z.number().int().positive(), inputName: z.string(), inputIcon: z.string().url().optional(), quantity: z.number().int().nonnegative(), xpEach: z.number().positive(), requiredLevel: z.number().int().min(1).max(99), secondary: z.string().optional(), secondaryQuantity: z.number().nonnegative().optional() })).max(100),
    selectedMethodIds: z.array(z.string()).max(100).optional(),
  }),
  z.object({
    ...publicFields,
    kind: z.literal("skill"),
    skill: z.string().min(1).max(40),
    targetLevel: z.number().int().min(2).max(99),
    targetXp: z.number().int().nonnegative(),
    currentLevel: z.number().int().min(1).max(99),
    currentXp: z.number().int().nonnegative(),
    sourceGoals: z.array(z.object({ goalId: z.string(), title: z.string().min(1).max(100), requiredLevel: z.number().int().min(1).max(99) })).max(20),
    bankedPlan: z.object({
      selectedMethodIds: z.array(z.string()).max(100),
      includeOutputs: z.boolean(),
      respectLevels: z.boolean(),
      showSecondaries: z.boolean(),
    }).optional(),
  }),
]);

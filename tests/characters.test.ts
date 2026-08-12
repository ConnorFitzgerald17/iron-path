import { describe, expect, it } from "vitest";
import { baseCharacterSlug, chooseCharacter } from "@/lib/server/characters";
import { createLinkCode, normalizeLinkCode } from "@/lib/server/plugin-auth";
import { mergeCharacterSyncState } from "@/lib/sync-state";
import { snapshotSchema } from "@/lib/server/snapshot-schema";
import { demoProfile } from "@/lib/demo-data";
import type { CharacterSummary, CharacterSyncState, SkillGoal } from "@/lib/types";

const characters: CharacterSummary[] = [
  { id: "one", name: "First", slug: "first", accountType: "Unknown", combatLevel: 3, totalLevel: 32, visibility: "private", createdAt: "2026-01-01T00:00:00Z" },
  { id: "two", name: "Second", slug: "second", accountType: "Ironman", combatLevel: 88, totalLevel: 1500, visibility: "private", createdAt: "2026-02-01T00:00:00Z" },
];

describe("multi-character selection and synchronization", () => {
  it("creates safe slugs only from RuneLite-verified names", () => {
    expect(baseCharacterSlug("Iron Vale")).toBe("iron-vale");
    expect(baseCharacterSlug("__A__")).toBe("iron-a");
    expect(baseCharacterSlug("  ")).toBe("iron-path");
  });

  it("creates unambiguous single-use codes and normalizes their display form", () => {
    const codes = Array.from({ length: 50 }, createLinkCode);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code))).toBe(true);
    expect(normalizeLinkCode("ab2c-def3")).toBe("AB2CDEF3");
  });

  it("prefers a valid URL, then remembered character, then the oldest", () => {
    expect(chooseCharacter(characters, "second", "first")?.id).toBe("two");
    expect(chooseCharacter(characters, "foreign", "second")?.id).toBe("two");
    expect(chooseCharacter(characters, "foreign", "stale")?.id).toBe("one");
  });

  it("merges authoritative RuneLite summary, skills, quests, items, and derived skill goals", () => {
    const profile = structuredClone(demoProfile);
    const skillGoal: SkillGoal = {
      id: "skill-herblore", kind: "skill", title: "Train 70 Herblore", skill: "Herblore", targetLevel: 70,
      targetXp: 737627, currentLevel: 69, currentXp: 668051, sourceGoals: [], public: false, status: "active",
    };
    profile.goals.push(skillGoal);
    const state: CharacterSyncState = {
      character: { id: profile.id, name: "Renamed Iron", slug: profile.slug, accountType: "Group Ironman", combatLevel: 110, totalLevel: 2001, visibility: "private", lastSyncedAt: "2026-08-10T12:00:00Z" },
      skills: [{ skill: skillGoal.skill, level: skillGoal.targetLevel, xp: skillGoal.targetXp }],
      quests: [{ quest: "Underground Pass", state: "finished" }],
      items: [{ itemId: 536, quantity: 44, container: "bank" }],
      goals: profile.goals.map((goal) => ({ id: goal.id, status: goal.status ?? "active" })),
    };
    const merged = mergeCharacterSyncState(profile, state);
    expect(merged.name).toBe("Renamed Iron");
    expect(merged.accountType).toBe("Group Ironman");
    expect(merged.totalLevel).toBe(2001);
    expect(merged.goals.find((goal) => goal.id === skillGoal.id)?.status).toBe("complete");
    expect(merged.items[0]).toMatchObject({ itemId: 536, quantity: 44, container: "bank" });
  });

  it("validates detected metadata while accepting older plugin snapshots", () => {
    const valid = {
      capturedAt: "2026-08-10T12:00:00Z", characterName: "Iron Two", accountType: "Ultimate Ironman", combatLevel: 92,
      skills: [{ skill: "Herblore", level: 70, xp: 737627 }], quests: [], items: [],
    };
    expect(snapshotSchema.safeParse(valid).success).toBe(true);
    const { accountType: _accountType, combatLevel: _combatLevel, ...legacy } = valid;
    void _accountType;
    void _combatLevel;
    expect(snapshotSchema.safeParse(legacy).success).toBe(true);
    expect(snapshotSchema.safeParse({ ...valid, accountType: "Unranked" }).success).toBe(false);
    expect(snapshotSchema.safeParse({ ...valid, combatLevel: 2 }).success).toBe(false);
  });

  it("uses an absolute boss KC without adding the starting KC twice", () => {
    const profile = structuredClone(demoProfile);
    const state: CharacterSyncState = {
      character: { id: profile.id, name: profile.name, slug: profile.slug, accountType: profile.accountType, combatLevel: profile.combatLevel, totalLevel: profile.totalLevel, visibility: profile.visibility },
      skills: profile.skills,
      quests: [],
      items: [],
      goals: profile.goals.map((goal) => ({ id: goal.id, status: goal.status ?? "active" })),
      killCounts: [{ sourceName: "Lizardman shaman", count: 2500, capturedAt: "2026-08-11T20:00:00Z" }],
    };

    const merged = mergeCharacterSyncState(profile, state);
    const grind = merged.goals.find((goal) => goal.id === "grind-dwh");

    expect(grind?.kind === "grind" ? grind.observedKc : 0).toBe(352);
  });
});

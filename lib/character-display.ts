import type { RuneScapeAccountType, SkillSnapshot } from "./types";

function skillLevels(skills: SkillSnapshot[]) {
  return new Map(skills.map((skill) => [skill.skill.trim().toLowerCase(), skill.level]));
}

export function combatLevelFromSkills(skills: SkillSnapshot[]): number | undefined {
  const levels = skillLevels(skills);
  const attack = levels.get("attack");
  const strength = levels.get("strength");
  const defence = levels.get("defence");
  const hitpoints = levels.get("hitpoints");
  const prayer = levels.get("prayer");
  const ranged = levels.get("ranged");
  const magic = levels.get("magic");
  if ([attack, strength, defence, hitpoints, prayer, ranged, magic].some((level) => level === undefined)) return undefined;

  const base = 0.25 * (defence! + hitpoints! + Math.floor(prayer! / 2));
  const melee = 0.325 * (attack! + strength!);
  const range = 0.325 * Math.floor(ranged! * 1.5);
  const mage = 0.325 * Math.floor(magic! * 1.5);
  return Math.max(3, Math.min(126, Math.floor(base + Math.max(melee, range, mage))));
}

export function resolvedCombatLevel(storedLevel: number, skills: SkillSnapshot[]): number {
  const stored = Number.isFinite(storedLevel) ? Math.floor(storedLevel) : 3;
  const derived = combatLevelFromSkills(skills);
  return derived === undefined ? stored : Math.max(stored, derived);
}

export function accountTypeLabel(accountType: RuneScapeAccountType, lastSyncedAt?: string | null): string {
  if (accountType !== "Unknown") return accountType;
  return lastSyncedAt ? "RuneLite synced" : "Awaiting RuneLite";
}

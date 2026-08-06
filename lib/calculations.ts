import type { BankedXpGoal, GrindGoal, OwnedItem, QuestGoal, XpActivity } from "./types";

const LEVEL_XP = [
  0, 0, 83, 174, 276, 388, 512, 650, 801, 969, 1154, 1358, 1584, 1833,
  2107, 2411, 2746, 3115, 3523, 3973, 4470, 5018, 5624, 6291, 7028, 7842,
  8740, 9730, 10824, 12031, 13363, 14833, 16456, 18247, 20224, 22406, 24815,
  27473, 30408, 33648, 37224, 41171, 45529, 50339, 55649, 61512, 67983,
  75127, 83014, 91721, 101333, 111945, 123660, 136594, 150872, 166636, 184040,
  203254, 224466, 247886, 273742, 302288, 333804, 368599, 407015, 449428,
  496254, 547953, 605032, 668051, 737627, 814445, 899257, 992895, 1096278,
  1210421, 1336443, 1475581, 1629200, 1798808, 1986068, 2192818, 2421087,
  2673114, 2951373, 3258594, 3597792, 3972294, 4385776, 4842295, 5346332,
  5902831, 6517253, 7195629, 7944614, 8771558, 9684577, 10692629, 11805606,
  13034431
];

export function xpForLevel(level: number): number {
  return LEVEL_XP[Math.max(1, Math.min(99, Math.floor(level)))] ?? LEVEL_XP[99];
}

export function levelForXp(xp: number): number {
  for (let level = 99; level >= 1; level -= 1) {
    if (xp >= xpForLevel(level)) return level;
  }
  return 1;
}

export function ownedQuantity(items: OwnedItem[], itemId?: number): number {
  if (!itemId) return 0;
  return items.filter((item) => item.itemId === itemId).reduce((sum, item) => sum + item.quantity, 0);
}

export function questReadiness(goal: QuestGoal, items: OwnedItem[], skills: Record<string, number>) {
  const skillReady = goal.requirements.filter((requirement) => (skills[requirement.skill] ?? 1) >= requirement.level).length;
  const questReady = goal.prerequisites.filter((quest) => quest.state === "finished").length;
  const itemReady = goal.items.filter((item) => item.manual ? item.complete : ownedQuantity(items, item.itemId) >= item.quantity).length;
  const ready = skillReady + questReady + itemReady;
  const total = goal.requirements.length + goal.prerequisites.length + goal.items.length;
  return { ready, total, percent: total ? Math.round((ready / total) * 100) : 100 };
}

export function dropProbability(kc: number, denominator: number): number {
  if (kc <= 0 || denominator <= 0) return 0;
  return (1 - Math.pow(1 - 1 / denominator, kc)) * 100;
}

export function grindProgress(goal: GrindGoal) {
  const kc = goal.startingKc + goal.observedKc;
  return {
    kc,
    rateProgress: Math.round((kc / goal.dropRate) * 100),
    probability: dropProbability(kc, goal.dropRate),
    obtained: goal.drops.find((drop) => drop.itemId === goal.targetItemId)?.quantity ?? 0
  };
}

export function activityXp(activity: XpActivity, level: number, respectLevels: boolean): number {
  if (respectLevels && level < activity.requiredLevel) return 0;
  return activity.quantity * activity.xpEach;
}

export function bankedXp(goal: BankedXpGoal) {
  const banked = goal.activities.reduce((sum, activity) => sum + activityXp(activity, goal.currentLevel, goal.respectLevels), 0);
  const projectedXp = goal.currentXp + banked;
  const targetXp = xpForLevel(goal.targetLevel);
  return {
    banked: Math.floor(banked),
    projectedXp: Math.floor(projectedXp),
    projectedLevel: levelForXp(projectedXp),
    targetXp,
    remaining: Math.max(0, targetXp - projectedXp),
    percent: Math.min(100, Math.round(((projectedXp - goal.currentXp) / Math.max(1, targetXp - goal.currentXp)) * 100))
  };
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function fullNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(Math.floor(value));
}

export type QuestState = "not_started" | "in_progress" | "finished";
export type GoalKind = "quest" | "grind" | "banked_xp";

export interface SkillSnapshot {
  skill: string;
  level: number;
  xp: number;
}

export interface OwnedItem {
  itemId: number;
  name: string;
  quantity: number;
  icon?: string;
  container?: "bank" | "inventory" | "equipment";
}

export interface QuestRequirement {
  skill: string;
  level: number;
  boostable?: boolean;
}

export interface QuestItemRequirement {
  id: string;
  itemId?: number;
  name: string;
  quantity: number;
  icon?: string;
  manual?: boolean;
  note?: string;
  complete?: boolean;
}

export interface QuestGoal {
  id: string;
  kind: "quest";
  title: string;
  description: string;
  wikiUrl: string;
  state: QuestState;
  public: boolean;
  requirements: QuestRequirement[];
  prerequisites: Array<{ name: string; state: QuestState }>;
  items: QuestItemRequirement[];
}

export interface DropRecord {
  itemId: number;
  name: string;
  quantity: number;
  rarity: string;
  icon?: string;
  public: boolean;
  source: "runelite" | "manual";
}

export interface GrindGoal {
  id: string;
  kind: "grind";
  title: string;
  monster: string;
  npcIds: number[];
  targetItemId: number;
  targetItemName: string;
  targetIcon?: string;
  dropRate: number;
  startingKc: number;
  observedKc: number;
  public: boolean;
  drops: DropRecord[];
}

export interface XpActivity {
  id: string;
  label: string;
  inputItemId: number;
  inputName: string;
  inputIcon?: string;
  quantity: number;
  xpEach: number;
  requiredLevel: number;
  secondary?: string;
  secondaryQuantity?: number;
}

export interface BankedXpGoal {
  id: string;
  kind: "banked_xp";
  title: string;
  skill: string;
  targetLevel: number;
  currentLevel: number;
  currentXp: number;
  public: boolean;
  includeOutputs: boolean;
  respectLevels: boolean;
  showSecondaries: boolean;
  activities: XpActivity[];
}

export type Goal = QuestGoal | GrindGoal | BankedXpGoal;

export interface CharacterProfile {
  id: string;
  name: string;
  slug: string;
  accountType: "Ironman" | "Hardcore Ironman" | "Ultimate Ironman";
  combatLevel: number;
  totalLevel: number;
  visibility: "private" | "public";
  lastSyncedAt?: string;
  skills: SkillSnapshot[];
  items: OwnedItem[];
  goals: Goal[];
}

export interface PluginSnapshotPayload {
  capturedAt: string;
  characterName: string;
  skills: SkillSnapshot[];
  quests: Array<{ quest: string; state: QuestState }>;
  items: Array<{ itemId: number; quantity: number; container: string }>;
}

export interface PluginLootEvent {
  eventId: string;
  occurredAt: string;
  npcId: number;
  npcName: string;
  items: Array<{ itemId: number; quantity: number }>;
}

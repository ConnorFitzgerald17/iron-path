export type QuestState = "not_started" | "in_progress" | "finished";
export type GoalKind = "quest" | "grind" | "banked_xp" | "skill";
export type GoalStatus = "active" | "complete";
export type RuneScapeAccountType = "Unknown" | "Normal" | "Ironman" | "Hardcore Ironman" | "Ultimate Ironman" | "Group Ironman" | "Hardcore Group Ironman";

export interface SkillSnapshot {
  skill: string;
  level: number;
  xp: number;
}

export interface SkillShowcaseSelection {
  all: boolean;
  skills: string[];
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
  status?: GoalStatus;
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
  status?: GoalStatus;
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

export interface BankedPlanSettings {
  selectedMethodIds: string[];
  includeOutputs: boolean;
  respectLevels: boolean;
  showSecondaries: boolean;
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
  status?: GoalStatus;
  includeOutputs: boolean;
  respectLevels: boolean;
  showSecondaries: boolean;
  activities: XpActivity[];
  selectedMethodIds?: string[];
}

export interface SkillGoal {
  id: string;
  kind: "skill";
  title: string;
  skill: string;
  targetLevel: number;
  targetXp: number;
  currentLevel: number;
  currentXp: number;
  sourceGoals: Array<{ goalId: string; title: string; requiredLevel: number }>;
  bankedPlan?: BankedPlanSettings;
  public: boolean;
  status?: GoalStatus;
}

export type Goal = QuestGoal | GrindGoal | BankedXpGoal | SkillGoal;

export type CollectionLogDisplayMode = "full" | "unlocked" | "summary";

export interface CollectionLogSlot {
  itemId: number;
  name: string;
  icon?: string;
  quantity: number;
  obtained: boolean;
  slotOrder: number;
  public: boolean;
}

export interface CollectionLogSection {
  key: string;
  category: string;
  name: string;
  obtainedCount: number;
  totalCount: number;
  capturedAt: string;
  public: boolean;
  displayMode: CollectionLogDisplayMode;
  sortOrder: number;
  slots: CollectionLogSlot[];
}

export interface RecentCollectionItem {
  itemId: number;
  name: string;
  icon?: string;
  sectionKey?: string;
  firstSeenAt?: string;
  source: "overview" | "unlock";
}

export interface KillCountSnapshot {
  sourceName: string;
  count: number;
  capturedAt: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  slug: string;
  accountType: RuneScapeAccountType;
  combatLevel: number;
  totalLevel: number;
  visibility: "private" | "public";
  lastSyncedAt?: string;
  skills: SkillSnapshot[];
  skillShowcase: SkillShowcaseSelection;
  items: OwnedItem[];
  goals: Goal[];
  killCounts: KillCountSnapshot[];
  collectionLogTotals: { obtainedCount: number; totalCount: number };
  collectionLog: CollectionLogSection[];
  recentCollections: RecentCollectionItem[];
  showRecentCollections: boolean;
  collectionLogUpdatedAt?: string;
}

export interface CharacterSummary {
  id: string;
  name: string;
  slug: string;
  accountType: RuneScapeAccountType;
  combatLevel: number;
  totalLevel: number;
  visibility: "private" | "public";
  lastSyncedAt?: string;
  createdAt: string;
}

export interface CharacterSyncState {
  character: Omit<CharacterSummary, "createdAt">;
  skills: SkillSnapshot[];
  quests: Array<{ quest: string; state: QuestState }>;
  items: Array<{ itemId: number; quantity: number; container: "bank" | "inventory" | "equipment" }>;
  goals: Array<{ id: string; status: GoalStatus }>;
  killCounts?: KillCountSnapshot[];
  collectionLogUpdatedAt?: string;
  collectionLog?: CollectionLogSection[];
  collectionLogTotals?: { obtainedCount: number; totalCount: number };
  recentCollections?: RecentCollectionItem[];
}

export interface PluginSnapshotPayload {
  capturedAt: string;
  characterName: string;
  accountType: Exclude<RuneScapeAccountType, "Unknown">;
  combatLevel: number;
  skills: SkillSnapshot[];
  quests: Array<{ quest: string; state: QuestState }>;
  items: Array<{ itemId: number; quantity: number; container: string }>;
  killCounts: KillCountSnapshot[];
}

export interface PluginLootEvent {
  eventId: string;
  occurredAt: string;
  npcId: number;
  npcName: string;
  items: Array<{ itemId: number; quantity: number }>;
}

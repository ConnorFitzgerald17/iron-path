import { itemIcon, runeLiteItemIcon } from "@/lib/icons";
import type {
  BankedXpGoal,
  CharacterProfile,
  CollectionLogDisplayMode,
  Goal,
  GrindGoal,
  OwnedItem,
  QuestGoal,
  QuestState,
  SkillGoal,
} from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/server";
import { defaultMethodIds } from "@/lib/xp-catalog";
import { xpForLevel } from "@/lib/calculations";
import { resolvedCombatLevel } from "@/lib/character-display";

type GoalRow = {
  id: string;
  kind: Goal["kind"];
  title: string;
  is_public: boolean;
  status: "active" | "complete";
  settings: Record<string, unknown> | null;
};

type CharacterRow = {
  id: string;
  name: string;
  slug: string;
  account_type: CharacterProfile["accountType"];
  combat_level: number;
  total_level: number;
  visibility: CharacterProfile["visibility"];
  last_synced_at: string | null;
  created_at?: string;
};

type CollectionSlotRow = {
  section_key: string;
  item_id: number;
  quantity: number;
  obtained: boolean;
  slot_order: number;
};

type CatalogItemRow = { item_id: number; name: string; icon_file: string | null };

async function loadAllCollectionSlots(characterId: string) {
  const admin = createAdminClient();
  const data: CollectionSlotRow[] = [];
  const pageSize = 1_000;
  for (let from = 0; ; from += pageSize) {
    const result = await admin.from("collection_log_slots")
      .select("section_key, item_id, quantity, obtained, slot_order")
      .eq("character_id", characterId)
      .order("section_key").order("slot_order")
      .range(from, from + pageSize - 1);
    if (result.error) return { data, error: result.error };
    const page = (result.data ?? []) as CollectionSlotRow[];
    data.push(...page);
    if (page.length < pageSize) return { data, error: null };
  }
}

async function loadCatalogItems(itemIds: number[]) {
  const admin = createAdminClient();
  const uniqueIds = [...new Set(itemIds)];
  const batches = Array.from({ length: Math.ceil(uniqueIds.length / 400) }, (_, index) => uniqueIds.slice(index * 400, index * 400 + 400));
  const results = await Promise.all(batches.map((batch) => admin.from("catalog_items").select("item_id, name, icon_file").in("item_id", batch)));
  const error = results.find((result) => result.error)?.error ?? null;
  return { data: results.flatMap((result) => (result.data ?? []) as CatalogItemRow[]), error };
}

export function goalToRow(goal: Goal) {
  const derivedStatus = goal.kind === "skill" ? (goal.currentXp >= goal.targetXp ? "complete" : "active") : (goal.status ?? "active");
  const { id: _id, kind, title, public: isPublic, status: _status, ...settings } = goal;
  void _id;
  void _status;
  return { kind, title, is_public: isPublic, status: derivedStatus, settings };
}

export function goalToUpdateRow(goal: Goal) {
  const row = goalToRow(goal);
  if (goal.kind === "skill") return row;
  const { status: _status, ...withoutStatus } = row;
  void _status;
  return withoutStatus;
}

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    public: row.is_public,
    status: row.status,
    ...(row.settings ?? {}),
  } as Goal;
}

function questKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function hydrateGoal(
  goal: Goal,
  skills: CharacterProfile["skills"],
  items: OwnedItem[],
  questStates: Map<string, QuestState>,
  loot: Array<{ npc_id: number; items: Array<{ itemId: number; quantity: number }> }>,
  hasPluginSnapshot: boolean,
): Goal {
  if (goal.kind === "quest") {
    const state = questStates.get(questKey(goal.title)) ?? goal.state ?? "not_started";
    return {
      ...goal,
      state,
      prerequisites: (goal.prerequisites ?? []).map((quest) => ({
        ...quest,
        state: questStates.get(questKey(quest.name)) ?? quest.state ?? "not_started",
      })),
    } satisfies QuestGoal;
  }

  if (goal.kind === "grind") {
    const events = loot.filter((event) => goal.npcIds.includes(event.npc_id));
    const quantities = new Map<number, number>();
    for (const event of events) {
      for (const drop of event.items ?? []) {
        quantities.set(drop.itemId, (quantities.get(drop.itemId) ?? 0) + drop.quantity);
      }
    }
    return {
      ...goal,
      observedKc: Math.max(goal.observedKc ?? 0, events.length),
      drops: (goal.drops ?? []).map((drop) => ({
        ...drop,
        quantity: Math.max(drop.quantity ?? 0, quantities.get(drop.itemId) ?? 0),
      })),
    } satisfies GrindGoal;
  }

  if (goal.kind === "skill") {
    const skill = skills.find((row) => row.skill.toLowerCase() === goal.skill.toLowerCase());
    const currentLevel = skill?.level ?? goal.currentLevel;
    const currentXp = skill?.xp ?? goal.currentXp;
    const targetXp = goal.targetXp || xpForLevel(goal.targetLevel);
    return {
      ...goal,
      currentLevel,
      currentXp,
      targetXp,
      status: currentXp >= targetXp ? "complete" : "active",
      bankedPlan: goal.bankedPlan ?? (defaultMethodIds(goal.skill, currentLevel).length ? {
        selectedMethodIds: defaultMethodIds(goal.skill, currentLevel), includeOutputs: true, respectLevels: true, showSecondaries: true,
      } : undefined),
      sourceGoals: goal.sourceGoals ?? [],
    } satisfies SkillGoal;
  }

  const skill = skills.find((row) => row.skill.toLowerCase() === goal.skill.toLowerCase());
  return {
    ...goal,
    currentLevel: skill?.level ?? goal.currentLevel,
    currentXp: skill?.xp ?? goal.currentXp,
    activities: (goal.activities ?? []).map((activity) => {
      const matchingItems = items.filter((item) => item.itemId === activity.inputItemId);
      return {
        ...activity,
        quantity: matchingItems.length ? matchingItems.reduce((sum, item) => sum + item.quantity, 0) : hasPluginSnapshot ? 0 : activity.quantity,
      };
    }),
    selectedMethodIds: goal.selectedMethodIds ?? (goal.activities ?? []).map((activity) => activity.id),
  } satisfies BankedXpGoal;
}

export async function loadCharacterProfile(character: CharacterRow, options: { publicOnly?: boolean } = {}): Promise<CharacterProfile> {
  const admin = createAdminClient();
  const [skillsResult, questsResult, itemsResult, goalsResult, lootResult, collectionResult, collectionSlotsResult, showcaseResult, skillShowcaseResult] = await Promise.all([
    admin.from("character_skills").select("skill, level, xp").eq("character_id", character.id).order("skill"),
    admin.from("character_quests").select("quest_key, state").eq("character_id", character.id),
    admin.from("character_items").select("item_id, container, quantity").eq("character_id", character.id),
    admin.from("goals").select("id, kind, title, is_public, status, settings").eq("character_id", character.id).eq("archived", false).order("sort_order"),
    admin.from("loot_events").select("npc_id, items").eq("character_id", character.id).order("occurred_at", { ascending: false }).limit(10_000),
    admin.from("collection_log_sections").select("section_key, category, name, obtained_count, total_count, captured_at").eq("character_id", character.id).order("category").order("name"),
    loadAllCollectionSlots(character.id),
    admin.from("collection_log_showcase").select("selection_key, selection_type, section_key, item_id, display_mode, sort_order").eq("character_id", character.id).order("sort_order"),
    admin.from("character_skill_showcase").select("skill_key, sort_order").eq("character_id", character.id).order("sort_order"),
  ]);

  const queryError = skillsResult.error ?? questsResult.error ?? itemsResult.error ?? goalsResult.error ?? lootResult.error ?? collectionResult.error ?? collectionSlotsResult.error ?? showcaseResult.error ?? skillShowcaseResult.error;
  if (queryError) throw new Error(queryError.message);

  const itemRows = itemsResult.data ?? [];
  const collectionLogTotals = (collectionResult.data ?? []).reduce((totals, section) => ({
    obtainedCount: totals.obtainedCount + Number(section.obtained_count),
    totalCount: totals.totalCount + Number(section.total_count),
  }), { obtainedCount: 0, totalCount: 0 });
  const itemIds = [...new Set([...itemRows.map((row) => Number(row.item_id)), ...(collectionSlotsResult.data ?? []).map((row) => Number(row.item_id))])];
  const catalogResult = itemIds.length
    ? await loadCatalogItems(itemIds)
    : { data: [], error: null };
  if (catalogResult.error) throw new Error(catalogResult.error.message);
  const catalog = new Map((catalogResult.data ?? []).map((row) => [Number(row.item_id), row]));

  const skills = (skillsResult.data ?? []).map((row) => ({
    skill: String(row.skill), level: Number(row.level), xp: Number(row.xp),
  }));
  const items = itemRows.map((row) => {
    const metadata = catalog.get(Number(row.item_id));
    return {
      itemId: Number(row.item_id),
      name: metadata?.name ?? `Item ${row.item_id}`,
      quantity: Number(row.quantity),
      icon: metadata?.icon_file ? itemIcon(metadata.icon_file) : undefined,
      container: row.container as OwnedItem["container"],
    };
  });
  const questStates = new Map((questsResult.data ?? []).map((row) => [questKey(String(row.quest_key)), row.state as QuestState]));
  const loot = (lootResult.data ?? []).map((row) => ({
    npc_id: Number(row.npc_id),
    items: (Array.isArray(row.items) ? row.items : []) as Array<{ itemId: number; quantity: number }>,
  }));
  const goals = (goalsResult.data ?? []).map((row) => hydrateGoal(rowToGoal(row as GoalRow), skills, items, questStates, loot, Boolean(character.last_synced_at)));
  const selections = showcaseResult.data ?? [];
  const showcasedSkillKeys = (skillShowcaseResult.data ?? []).map((row) => String(row.skill_key));
  const sectionSelections = new Map(selections.filter((row) => row.selection_type === "section").map((row) => [String(row.section_key), row]));
  const itemSelections = new Set(selections.filter((row) => row.selection_type === "item").map((row) => `${row.section_key}:${row.item_id}`));
  const collectionLog = (collectionResult.data ?? []).map((section) => {
    const selection = sectionSelections.get(String(section.section_key));
    const slots = (collectionSlotsResult.data ?? []).filter((slot) => slot.section_key === section.section_key).map((slot) => {
      const metadata = catalog.get(Number(slot.item_id));
      return {
        itemId: Number(slot.item_id), name: metadata?.name ?? `Item ${slot.item_id}`,
        icon: runeLiteItemIcon(Number(slot.item_id)),
        quantity: Number(slot.quantity), obtained: Boolean(slot.obtained), slotOrder: Number(slot.slot_order),
        public: itemSelections.has(`${section.section_key}:${slot.item_id}`),
      };
    });
    return {
      key: String(section.section_key), category: String(section.category), name: String(section.name),
      obtainedCount: Number(section.obtained_count), totalCount: Number(section.total_count), capturedAt: String(section.captured_at),
      public: Boolean(selection), displayMode: (selection?.display_mode ?? "full") as CollectionLogDisplayMode,
      sortOrder: Number(selection?.sort_order ?? 0), slots,
    };
  }).filter((section) => !options.publicOnly || section.public || section.slots.some((slot) => slot.public));

  return {
    id: character.id,
    name: character.name,
    slug: character.slug,
    accountType: character.account_type,
    combatLevel: resolvedCombatLevel(character.combat_level, skills),
    totalLevel: character.total_level,
    visibility: character.visibility,
    lastSyncedAt: character.last_synced_at ?? undefined,
    skills,
    skillShowcase: {
      all: showcasedSkillKeys.includes("*"),
      skills: showcasedSkillKeys.filter((skill) => skill !== "*"),
    },
    items,
    goals,
    collectionLogTotals,
    collectionLog,
  };
}

export type { CharacterRow, GoalRow };

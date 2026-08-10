import { NextResponse } from "next/server";
import { itemIcon, runeLiteItemIcon } from "@/lib/icons";
import { authenticatedUser } from "@/lib/server/app-auth";
import { createAdminClient } from "@/lib/supabase/server";
import type { Goal, QuestItemRequirement } from "@/lib/types";
import { isMainGameCatalogEntry } from "@/lib/wiki/catalog";

function safeSearch(value: string) {
  return value.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function searchTerms(query: string) {
  const terms = new Set([query]);
  if (/vampire/i.test(query)) terms.add(query.replace(/vampire/ig, "vampyre"));
  if (/vampyre/i.test(query)) terms.add(query.replace(/vampyre/ig, "vampire"));
  return [...terms];
}

function mainGameMonster(row: { wiki_key?: unknown; name?: unknown; version_anchor?: unknown }) {
  return isMainGameCatalogEntry(row.wiki_key, row.name, row.version_anchor);
}

function mainGameDrop(row: { source_key?: unknown; item_name?: unknown; raw?: unknown }) {
  const raw = row.raw && typeof row.raw === "object" ? row.raw as Record<string, unknown> : {};
  return isMainGameCatalogEntry(row.source_key, row.item_name, raw["Dropped from"], raw["Dropped item"]);
}

export async function GET(request: Request) {
  const user = await authenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const q = safeSearch(url.searchParams.get("q") ?? "");
  const kind = url.searchParams.get("kind") === "grind" ? "grind" : "quest";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const admin = createAdminClient();
  const nameFilter = searchTerms(q).map((term) => `name.ilike.%${term}%`).join(",");
  if (kind === "quest") {
    const { data: quests, error } = await admin.from("catalog_quests")
      .select("wiki_key, name, description, skill_requirements, prerequisite_quests, parsed_items")
      .or(nameFilter).order("name").limit(12);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const itemNames = [...new Set((quests ?? []).flatMap((quest) => {
      const rows = Array.isArray(quest.parsed_items) ? quest.parsed_items : [];
      return rows.map((item) => String((item as { name?: string }).name ?? "")).filter(Boolean);
    }))];
    const { data: catalogItems } = itemNames.length
      ? await admin.from("catalog_items").select("item_id, name, icon_file").in("name", itemNames)
      : { data: [] };
    const itemMap = new Map((catalogItems ?? []).map((item) => [String(item.name).toLowerCase(), item]));

    const results: Goal[] = (quests ?? []).map((quest) => ({
      id: `catalog-quest-${slug(String(quest.wiki_key))}`,
      kind: "quest",
      title: String(quest.name),
      description: String(quest.description ?? "Track every requirement for this quest.").slice(0, 10_000),
      wikiUrl: `https://oldschool.runescape.wiki/w/${encodeURIComponent(String(quest.wiki_key)).replace(/%20/g, "_")}`,
      state: "not_started",
      public: false,
      requirements: (Array.isArray(quest.skill_requirements) ? quest.skill_requirements : []).map((requirement) => ({
        skill: String((requirement as { skill?: string }).skill ?? ""),
        level: Number((requirement as { level?: number }).level ?? 1),
        boostable: (requirement as { flags?: string[] }).flags?.includes("boostable"),
      })).filter((requirement) => requirement.skill),
      prerequisites: (Array.isArray(quest.prerequisite_quests) ? quest.prerequisite_quests : []).map((name) => ({ name: String(name), state: "not_started" as const })),
      items: (Array.isArray(quest.parsed_items) ? quest.parsed_items : []).map((raw, index) => {
        const item = raw as { name?: string; quantity?: number; manual?: boolean; note?: string };
        const metadata = itemMap.get(String(item.name ?? "").toLowerCase());
        return {
          id: `${slug(String(item.name ?? "item"))}-${index}`,
          itemId: metadata ? Number(metadata.item_id) : undefined,
          name: String(item.name ?? "Manual requirement"),
          quantity: Number(item.quantity ?? 1),
          icon: metadata?.icon_file ? itemIcon(String(metadata.icon_file)) : undefined,
          manual: Boolean(item.manual || !metadata),
          note: item.note ? String(item.note) : undefined,
          complete: false,
        } satisfies QuestItemRequirement;
      }),
    }));
    return NextResponse.json({ results });
  }

  const searchBy = url.searchParams.get("searchBy") === "monster" ? "monster" : "item";
  const [monsterSearch, itemDropSearch] = await Promise.all([
    searchBy === "monster"
      ? admin.from("catalog_monsters").select("wiki_key, name, npc_ids, version_anchor").or(nameFilter).order("name").limit(50)
      : Promise.resolve({ data: [], error: null }),
    searchBy === "item"
      ? admin.from("catalog_drops").select("source_key, item_name, rarity, rarity_denominator, raw").or(searchTerms(q).map((term) => `item_name.ilike.%${term}%`).join(",")).not("rarity_denominator", "is", null).order("rarity_denominator", { ascending: false }).limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (monsterSearch.error || itemDropSearch.error) return NextResponse.json({ error: monsterSearch.error?.message ?? itemDropSearch.error?.message }, { status: 500 });

  const matchedMonsters = (monsterSearch.data ?? []).filter(mainGameMonster);
  const matchedItemDrops = (itemDropSearch.data ?? []).filter(mainGameDrop);
  const itemSources = [...new Set(matchedItemDrops.map((drop) => String(drop.source_key)))];
  const sourceMonsters = itemSources.length
    ? await admin.from("catalog_monsters").select("wiki_key, name, npc_ids, version_anchor").in("name", itemSources).limit(100)
    : { data: [], error: null };
  if (sourceMonsters.error) return NextResponse.json({ error: sourceMonsters.error.message }, { status: 500 });
  const monsterMap = new Map([...matchedMonsters, ...(sourceMonsters.data ?? []).filter(mainGameMonster)].map((monster) => [String(monster.wiki_key), monster]));
  const monsters = [...monsterMap.values()];
  const sources = [...new Set(monsters.map((monster) => String(monster.wiki_key).split("#")[0]))];
  const { data: drops } = sources.length
    ? await admin.from("catalog_drops").select("source_key, item_name, rarity, rarity_denominator, raw").in("source_key", sources).not("rarity_denominator", "is", null).gte("rarity_denominator", 25)
    : { data: [] };
  const mainGameDrops = (drops ?? []).filter(mainGameDrop);
  const dropNames = [...new Set(mainGameDrops.map((drop) => String(drop.item_name)))];
  const { data: catalogItems } = dropNames.length
    ? await admin.from("catalog_items").select("item_id, name, icon_file").in("name", dropNames)
    : { data: [] };
  const itemMap = new Map((catalogItems ?? []).map((item) => [String(item.name).toLowerCase(), item]));
  const importance = (drop: { rarity_denominator: number | null; raw: unknown }) => {
    const raw = drop.raw && typeof drop.raw === "object" ? drop.raw as Record<string, unknown> : {};
    return Number(raw["Drop Value"] ?? 0) * Math.log10(Number(drop.rarity_denominator ?? 1) + 1);
  };
  const monsterGroups = new Map<string, { name: string; npcIds: Set<number> }>();
  for (const monster of monsters) {
    const source = String(monster.wiki_key).split("#")[0];
    const group = monsterGroups.get(source) ?? { name: String(monster.name), npcIds: new Set<number>() };
    for (const npcId of monster.npc_ids ?? []) group.npcIds.add(Number(npcId));
    monsterGroups.set(source, group);
  }

  const results: Goal[] = [];
  for (const [source, monster] of monsterGroups) {
    const sourceDrops = mainGameDrops.filter((drop) => drop.source_key === source && itemMap.has(String(drop.item_name).toLowerCase())).sort((a, b) => importance(b) - importance(a));
    const matchingTargets = matchedItemDrops.filter((drop) => drop.source_key === source && itemMap.has(String(drop.item_name).toLowerCase()));
    const rawTargets = matchingTargets.length ? matchingTargets : sourceDrops.slice(0, 6);
    const targets = [...new Map(rawTargets.map((drop) => [String(drop.item_name).toLowerCase(), drop])).values()];
    const notableMap = new Map([...targets, ...sourceDrops].map((drop) => [String(drop.item_name).toLowerCase(), drop]));
    const notable = [...notableMap.values()].slice(0, 8);
    for (const target of targets.slice(0, 6)) {
      const targetMetadata = itemMap.get(String(target.item_name).toLowerCase());
      if (!targetMetadata || !target.rarity_denominator) continue;
      results.push({
        id: `catalog-grind-${slug(source)}-${targetMetadata.item_id}`,
        kind: "grind",
        title: `Hunt ${target.item_name}`,
        monster: source,
        npcIds: [...monster.npcIds],
        targetItemId: Number(targetMetadata.item_id),
        targetItemName: String(target.item_name),
        targetIcon: runeLiteItemIcon(Number(targetMetadata.item_id)),
        dropRate: Number(target.rarity_denominator),
        startingKc: 0,
        observedKc: 0,
        public: false,
        drops: notable.map((drop) => {
          const metadata = itemMap.get(String(drop.item_name).toLowerCase())!;
          return {
            itemId: Number(metadata.item_id), name: String(drop.item_name), quantity: 0,
            rarity: String(drop.rarity), icon: runeLiteItemIcon(Number(metadata.item_id)),
            public: drop.item_name === target.item_name, source: "manual" as const,
          };
        }),
      });
    }
  }
  return NextResponse.json({ results: [...new Map(results.map((goal) => [goal.id, goal])).values()].slice(0, 30) });
}

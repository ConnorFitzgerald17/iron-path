import { createAdminClient } from "@/lib/supabase/server";

const WIKI_API = "https://oldschool.runescape.wiki/api.php";
const PRICE_API = "https://prices.runescape.wiki/api/v1/osrs";

export interface NormalizedQuestItem {
  name: string;
  quantity: number;
  manual: boolean;
  note: string;
}

function userAgent() {
  return process.env.IRON_PATH_WIKI_USER_AGENT || "IronPath/0.1 (development; contact@example.com)";
}

async function wikiRequest(params: Record<string, string>) {
  const url = new URL(WIKI_API);
  Object.entries({ format: "json", formatversion: "2", ...params }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { headers: { "User-Agent": userAgent() }, next: { revalidate: 0 } });
  if (!response.ok) throw new Error(`OSRS Wiki request failed: ${response.status}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function bucket(bucketName: string, fields: string[], offset = 0, limit = 500) {
  const query = `bucket('${bucketName}').select(${fields.map((field) => `'${field}'`).join(",")}).limit(${limit}).offset(${offset}).run()`;
  const data = await wikiRequest({ action: "bucket", query });
  if (data.error) throw new Error(String(data.error));
  return (data.bucket ?? []) as Array<Record<string, unknown>>;
}

async function allBucketRows(bucketName: string, fields: string[], limit = 500) {
  const rows: Array<Record<string, unknown>> = [];
  for (let offset = 0; ; offset += limit) {
    const page = await bucket(bucketName, fields, offset, limit);
    rows.push(...page);
    if (page.length < limit) break;
  }
  return rows;
}

export function stripWikiMarkup(value: string) {
  return value
    .replace(/<!--.*?-->/gs, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/'{2,}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseQuestItems(wikitext: string): NormalizedQuestItem[] {
  if (!wikitext || /^none\.?$/i.test(wikitext.trim())) return [];
  return wikitext.split(/\n(?=\*+)/).map((line) => line.replace(/^\*+\s*/, "").trim()).filter(Boolean).map((line) => {
    const quantityMatch = line.match(/^(?:At least\s+)?([\d,]+)\s+/i);
    const links = [...line.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g)];
    const name = links[0] ? stripWikiMarkup(links[0][2] ?? links[0][1]) : stripWikiMarkup(line);
    const alternative = /\b(or|any kind|any |one of|runes for|work\))\b/i.test(line) || links.length !== 1;
    return {
      name: name || stripWikiMarkup(line),
      quantity: quantityMatch ? Number(quantityMatch[1].replace(/,/g, "")) : 1,
      manual: alternative || !links.length,
      note: stripWikiMarkup(line)
    };
  });
}

export function parseSkillRequirements(requirements: string) {
  const matches = [...requirements.matchAll(/data-skill=\\?"([^"\\]+)\\?"\s+data-level=\\?"(\d+)\\?"/g)];
  return matches.map((match) => ({ skill: match[1] === "Quest points" ? "Quest points" : match[1], level: Number(match[2]) }));
}

export function parseRarityDenominator(rarity: string): number | null {
  const cleaned = rarity.replace(/,/g, "").trim();
  if (/^always$/i.test(cleaned)) return 1;
  const fraction = cleaned.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (!fraction) return null;
  const numerator = Number(fraction[1]);
  const denominator = Number(fraction[2]);
  return numerator > 0 ? denominator / numerator : null;
}

export function parseLuaQuestRequirements(content: string) {
  const results: Array<{ quest: string; prerequisites: string[]; skills: Array<{ skill: string; level: number; flags: string[] }> }> = [];
  const tableStart = content.indexOf("local questReqs");
  const questTable = tableStart >= 0 ? content.slice(tableStart) : content;
  const startPattern = /^\s*\['((?:\\'|[^'])+)'\]\s*=\s*\{/gm;
  const starts = [...questTable.matchAll(startPattern)].filter(
    (match) => match[1] !== "quests" && match[1] !== "skills",
  );
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index];
    const body = questTable.slice((start.index ?? 0) + start[0].length, starts[index + 1]?.index ?? questTable.length);
    const questsStart = body.indexOf("['quests']");
    const skillsStart = body.indexOf("['skills']");
    const questsBody = questsStart >= 0 ? body.slice(questsStart, skillsStart >= 0 ? skillsStart : body.length) : "";
    const skillsBody = skillsStart >= 0 ? body.slice(skillsStart) : "";
    const prerequisites = [...questsBody.matchAll(/'((?:\\'|[^'])+)'/g)]
      .map((match) => match[1].replace(/\\'/g, "'"))
      .filter((quest) => quest !== "quests");
    const skills = [...skillsBody.matchAll(/\{\s*'([^']+)'\s*,\s*(\d+)([^}]*)}/g)].map((match) => ({
      skill: match[1], level: Number(match[2]), flags: [...match[3].matchAll(/'([^']+)'/g)].map((flag) => flag[1])
    }));
    results.push({ quest: start[1].replace(/\\'/g, "'"), prerequisites, skills });
  }
  return results;
}

async function fetchQuestRequirementModule() {
  const data = await wikiRequest({ action: "query", prop: "revisions", rvprop: "content", rvslots: "main", titles: "Module:Questreq/data" });
  const query = data.query as { pages?: Array<{ revisions?: Array<{ slots?: { main?: { content?: string } } }> }> } | undefined;
  return query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content ?? "";
}

export async function syncWikiCatalog() {
  const admin = createAdminClient();
  const startedAt = new Date().toISOString();
  const [mappingResponse, questRows, requirementModule, monsterRows, dropRows] = await Promise.all([
    fetch(`${PRICE_API}/mapping`, { headers: { "User-Agent": userAgent() }, cache: "no-store" }).then((response) => {
      if (!response.ok) throw new Error(`Price mapping request failed: ${response.status}`);
      return response.json() as Promise<Array<Record<string, unknown>>>;
    }),
    allBucketRows("quest", ["page_name", "json"]),
    fetchQuestRequirementModule(),
    allBucketRows("infobox_monster", ["page_name", "name", "id", "image", "combat_level", "version_anchor"]),
    allBucketRows("dropsline", ["page_name", "item_name", "drop_json"])
  ]);

  const items = mappingResponse.map((item) => ({
    item_id: item.id, name: item.name, icon_file: item.icon, examine: item.examine,
    members: item.members ?? false, updated_at: startedAt
  }));
  for (let index = 0; index < items.length; index += 500) {
    const { error } = await admin.from("catalog_items").upsert(items.slice(index, index + 500), { onConflict: "item_id" });
    if (error) throw error;
  }

  const luaRequirements = new Map(parseLuaQuestRequirements(requirementModule).map((record) => [record.quest, record]));
  const quests = questRows.map((row) => {
    const raw = JSON.parse(String(row.json || "{}")) as Record<string, string>;
    const structured = luaRequirements.get(String(row.page_name));
    return {
      wiki_key: String(row.page_name), name: raw.name || row.page_name,
      description: stripWikiMarkup(raw.desc || ""), difficulty: raw.difficulty, length: raw.length,
      requirements_raw: raw.requirements || "", items_raw: raw.items || "",
      skill_requirements: structured?.skills ?? parseSkillRequirements(raw.requirements || ""),
      prerequisite_quests: structured?.prerequisites ?? [],
      parsed_items: parseQuestItems(raw.items || ""), updated_at: startedAt
    };
  });
  const { error: questError } = await admin.from("catalog_quests").upsert(quests, { onConflict: "wiki_key" });
  if (questError) throw questError;

  const monsters = monsterRows.map((row) => ({
    wiki_key: String(row.page_name), name: String(row.name || row.page_name),
    npc_ids: String(row.id || "").split(/[,;]/).map((id) => Number(id.trim())).filter(Number.isFinite),
    image_file: Array.isArray(row.image) ? row.image[0] : row.image,
    combat_level: row.combat_level ? Number(row.combat_level) : null,
    version_anchor: row.version_anchor || null, updated_at: startedAt
  }));
  const { error: monsterError } = await admin.from("catalog_monsters").upsert(monsters, { onConflict: "wiki_key" });
  if (monsterError) throw monsterError;

  const drops = dropRows.map((row) => {
    const raw = JSON.parse(String(row.drop_json || "{}")) as Record<string, unknown>;
    const rarity = String(raw.Rarity || "Varies");
    return {
      source_key: String(row.page_name), item_name: String(row.item_name), rarity,
      rarity_denominator: parseRarityDenominator(rarity), quantity_low: raw["Quantity Low"] ?? null,
      quantity_high: raw["Quantity High"] ?? null, raw, updated_at: startedAt
    };
  });
  for (let index = 0; index < drops.length; index += 500) {
    const { error } = await admin.from("catalog_drops").upsert(drops.slice(index, index + 500), { onConflict: "source_key,item_name,rarity" });
    if (error) throw error;
  }

  await admin.from("catalog_sync_runs").insert({ started_at: startedAt, completed_at: new Date().toISOString(), status: "complete", counts: { items: items.length, quests: quests.length, monsters: monsters.length, drops: drops.length } });
  return { items: items.length, quests: quests.length, monsters: monsters.length, drops: drops.length };
}

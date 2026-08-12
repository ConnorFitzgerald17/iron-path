import { createHash, randomBytes, verify } from "node:crypto";
import type { Achievement } from "@/lib/achievements";
import { achievementLabel, collectionLogProgress } from "@/lib/achievements";
import { siteUrl } from "@/lib/site-url";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordRequest(body: string, signature: string | null, timestamp: string | null, publicKey: string | undefined) {
  if (!signature || !timestamp || !publicKey || !/^[0-9a-f]{64}$/i.test(publicKey) || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  try {
    const key = Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKey, "hex")]);
    return verify(null, Buffer.from(timestamp + body), { key, format: "der", type: "spki" }, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export function discordUser(interaction: Record<string, unknown>) {
  const member = interaction.member as { user?: { id?: string; username?: string; global_name?: string } } | undefined;
  const direct = interaction.user as { id?: string; username?: string; global_name?: string } | undefined;
  return member?.user ?? direct ?? {};
}

export function commandOption(data: Record<string, unknown>, name: string) {
  const options = Array.isArray(data.options) ? data.options as Array<{ name?: string; value?: unknown }> : [];
  return options.find((option) => option.name === name)?.value;
}

export function hasManageGuild(interaction: Record<string, unknown>) {
  const permissions = (interaction.member as { permissions?: string } | undefined)?.permissions;
  if (!permissions) return false;
  try {
    return (BigInt(permissions) & 0x20n) === 0x20n;
  } catch {
    return false;
  }
}

export function ephemeral(content: string) {
  return { type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } };
}

export function newLinkToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashLinkToken(token) };
}

export function hashLinkToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function achievementDiscordMessage(achievement: Achievement) {
  const origin = siteUrl(process.env.IRON_PATH_API_ORIGIN);
  const achievementUrl = new URL(`/achievement/${achievement.publicId}`, origin).toString();
  const collectionUnlock = achievement.type === "collection_unlock";
  const action = collectionUnlock ? "unlocked" : "completed";
  return {
    content: achievement.simulated ? "🧪 **Iron Path test achievement**" : "🏆 **New Iron Path achievement**",
    embeds: [{
      author: { name: achievement.simulated
        ? `Test preview · ${achievementLabel(achievement.type)}`
        : `${achievementLabel(achievement.type)} · RuneLite verified` },
      title: collectionUnlock ? achievement.title : `Path complete: ${achievement.title}`,
      description: `**${achievement.characterName}** ${action} this achievement.\n${achievement.detail}`,
      url: achievementUrl,
      color: collectionUnlock ? 0xd5ad55 : 0x77966d,
      fields: [
        ...(collectionUnlock && achievement.collectionObtained !== undefined && achievement.collectionTotal !== undefined
          ? [{ name: "Collection Log", value: collectionLogProgress(achievement.collectionObtained, achievement.collectionTotal), inline: false }]
          : []),
        { name: "Account", value: achievement.accountType, inline: true },
        { name: "Combat", value: String(achievement.combatLevel), inline: true },
        { name: "Total level", value: achievement.totalLevel.toLocaleString("en-GB"), inline: true },
      ],
      ...(achievement.itemIcon ? { thumbnail: { url: achievement.itemIcon } } : {}),
      footer: { text: achievement.simulated ? "Local simulation · Not real progress" : "Iron Path · Progress worth sharing" },
      timestamp: achievement.occurredAt,
    }],
    components: [{ type: 1, components: [
      { type: 2, style: 5, label: "View achievement", url: achievementUrl },
      ...(achievement.profilePublic ? [{ type: 2, style: 5, label: "View Iron Path", url: new URL(`/showcase/${achievement.characterSlug}`, origin).toString() }] : []),
    ] }],
    allowed_mentions: { parse: [] },
  };
}

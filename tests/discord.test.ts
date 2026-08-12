import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { Achievement } from "@/lib/achievements";
import { achievementDiscordMessage, hasManageGuild, verifyDiscordRequest } from "@/lib/server/discord";

const achievement: Achievement = {
  id: 1,
  publicId: "11111111-1111-4111-8111-111111111111",
  characterId: "22222222-2222-4222-8222-222222222222",
  characterName: "Ferrous",
  characterSlug: "ferrous",
  accountType: "Ironman",
  combatLevel: 104,
  totalLevel: 2014,
  profilePublic: true,
  type: "collection_unlock",
  occurredAt: "2026-08-12T12:00:00.000Z",
  title: "Abyssal whip",
  detail: "Unlocked in Abyssal Sire",
  itemId: 4151,
  itemIcon: "https://static.runelite.net/cache/item/icon/4151.png",
  collectionObtained: 623,
  collectionTotal: 1921,
};

describe("Discord integration", () => {
  afterEach(() => delete process.env.IRON_PATH_API_ORIGIN);

  it("accepts authentic Discord Ed25519 signatures and rejects modified bodies", () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const rawPublicKey = publicKey.export({ type: "spki", format: "der" }).subarray(-32).toString("hex");
    const timestamp = "1786536000";
    const body = JSON.stringify({ type: 1 });
    const signature = sign(null, Buffer.from(timestamp + body), privateKey).toString("hex");

    expect(verifyDiscordRequest(body, signature, timestamp, rawPublicKey)).toBe(true);
    expect(verifyDiscordRequest(`${body} `, signature, timestamp, rawPublicKey)).toBe(false);
    expect(verifyDiscordRequest(body, null, timestamp, rawPublicKey)).toBe(false);
  });

  it("checks Manage Server without granting it to ordinary members", () => {
    expect(hasManageGuild({ member: { permissions: "32" } })).toBe(true);
    expect(hasManageGuild({ member: { permissions: "2048" } })).toBe(false);
    expect(hasManageGuild({})).toBe(false);
  });

  it("renders a native, mention-safe achievement card without relying on a large image", () => {
    process.env.IRON_PATH_API_ORIGIN = "https://ironpath.example";
    const message = achievementDiscordMessage(achievement);

    expect(message.content).toContain("New Iron Path achievement");
    expect(message.allowed_mentions).toEqual({ parse: [] });
    expect(message.embeds[0].url).toBe(`https://ironpath.example/achievement/${achievement.publicId}`);
    expect(message.embeds[0].description).toContain("Ferrous");
    expect(message.embeds[0].fields.map((field) => field.name)).toEqual(["Collection Log", "Account", "Combat", "Total level"]);
    expect(message.embeds[0].fields[0].value).toBe("623 / 1,921 unlocked (32.4%)");
    expect(message.embeds[0].thumbnail).toEqual({ url: achievement.itemIcon });
    expect(message.embeds[0]).not.toHaveProperty("image");
    expect(message.components[0].components.map((button) => button.label)).toEqual(["View achievement", "View Iron Path"]);
  });

  it("does not expose a private character profile from an achievement card", () => {
    process.env.IRON_PATH_API_ORIGIN = "https://ironpath.example";
    const message = achievementDiscordMessage({ ...achievement, profilePublic: false });
    expect(message.components[0].components.map((button) => button.label)).toEqual(["View achievement"]);
  });

  it("clearly labels simulated achievements as test data", () => {
    process.env.IRON_PATH_API_ORIGIN = "https://ironpath.example";
    const message = achievementDiscordMessage({ ...achievement, simulated: true });
    expect(message.content).toContain("test achievement");
    expect(message.embeds[0].author.name).toContain("Test preview");
    expect(message.embeds[0].footer.text).toContain("Not real progress");
  });
});

import { NextResponse } from "next/server";
import { achievementDiscordMessage, discordUser, ephemeral, hasManageGuild, newLinkToken, verifyDiscordRequest } from "@/lib/server/discord";
import { loadPublicAchievement } from "@/lib/server/achievements";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

type DiscordOption = { name?: string; value?: string; options?: DiscordOption[] };
type Interaction = Record<string, unknown> & {
  type?: number;
  guild_id?: string;
  channel_id?: string;
  data?: { name?: string; options?: DiscordOption[] };
};

function subcommand(interaction: Interaction) {
  const option = interaction.data?.options?.[0];
  return { name: option?.name, options: option?.options ?? [] };
}

function option(options: DiscordOption[], name: string) {
  return options.find((row) => row.name === name)?.value;
}

async function linkedUser(discordUserId: string) {
  const { data } = await createAdminClient().from("discord_accounts").select("user_id").eq("discord_user_id", discordUserId).maybeSingle();
  return data?.user_id ? String(data.user_id) : null;
}

async function selectedCharacter(discordUserId: string, guildId: string | undefined) {
  const admin = createAdminClient();
  if (guildId) {
    const { data } = await admin.from("discord_guild_memberships")
      .select("characters!inner(id, name, slug, account_type, combat_level, total_level, visibility)")
      .eq("guild_id", guildId).eq("discord_user_id", discordUserId).maybeSingle();
    const character = data?.characters as unknown as Record<string, unknown> | undefined;
    if (character) return character;
  }
  const userId = await linkedUser(discordUserId);
  if (!userId) return null;
  const { data } = await admin.from("characters").select("id, name, slug, account_type, combat_level, total_level, visibility")
    .eq("user_id", userId).order("created_at").limit(1).maybeSingle();
  return data as Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyDiscordRequest(
    body,
    request.headers.get("x-signature-ed25519"),
    request.headers.get("x-signature-timestamp"),
    process.env.DISCORD_PUBLIC_KEY,
  )) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  const interaction = JSON.parse(body) as Interaction;
  if (interaction.type === 1) return NextResponse.json({ type: 1 });
  if (interaction.type !== 2 || interaction.data?.name !== "ironpath") return NextResponse.json(ephemeral("Unsupported command."));
  if (!isSupabaseConfigured()) return NextResponse.json(ephemeral("Iron Path is running in demo mode."));

  const user = discordUser(interaction);
  if (!user.id) return NextResponse.json(ephemeral("Discord user information was missing."));
  const command = subcommand(interaction);
  const admin = createAdminClient();

  if (command.name === "link") {
    const token = newLinkToken();
    const { error } = await admin.from("discord_link_codes").insert({
      discord_user_id: user.id,
      discord_username: user.global_name ?? user.username ?? null,
      token_hash: token.hash,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) return NextResponse.json(ephemeral("Could not create a link. Please try again."));
    const url = new URL("/discord/link", siteUrl(process.env.IRON_PATH_API_ORIGIN));
    url.searchParams.set("token", token.token);
    return NextResponse.json(ephemeral(`Connect your Discord account to Iron Path within 10 minutes:\n${url}`));
  }

  if (command.name === "setup") {
    if (!interaction.guild_id || !interaction.channel_id) return NextResponse.json(ephemeral("Run setup inside a server channel."));
    if (!hasManageGuild(interaction)) return NextResponse.json(ephemeral("You need Manage Server permission to configure the feed."));
    const channelId = option(command.options, "channel") ?? interaction.channel_id;
    const { error } = await admin.from("discord_guilds").upsert({
      guild_id: interaction.guild_id,
      achievement_channel_id: channelId,
      enabled: true,
      configured_by_discord_user_id: user.id,
      updated_at: new Date().toISOString(),
    });
    return NextResponse.json(ephemeral(error ? "The achievement channel could not be saved." : `Achievement feed configured for <#${channelId}>.`));
  }

  if (command.name === "join") {
    if (!interaction.guild_id) return NextResponse.json(ephemeral("Run join inside your clan server."));
    const userId = await linkedUser(user.id);
    if (!userId) return NextResponse.json(ephemeral("Link your account first with `/ironpath link`."));
    let characters = admin.from("characters").select("id, name").eq("user_id", userId).order("created_at");
    const requested = option(command.options, "character")?.trim();
    if (requested) characters = characters.ilike("name", requested);
    const { data } = await characters.limit(1).maybeSingle();
    if (!data) return NextResponse.json(ephemeral("No matching RuneLite-verified character was found."));
    const { error } = await admin.from("discord_guild_memberships").upsert({
      guild_id: interaction.guild_id,
      discord_user_id: user.id,
      character_id: data.id,
      announcements_enabled: true,
    });
    return NextResponse.json(ephemeral(error ? "Could not join this clan feed. Ask an admin to run `/ironpath setup`." : `${data.name} will now share achievements in this clan.`));
  }

  const character = await selectedCharacter(user.id, interaction.guild_id);
  if (!character) return NextResponse.json(ephemeral("Link and select a character with `/ironpath link`, then `/ironpath join`."));

  if (command.name === "profile") {
    if (character.visibility !== "public") return NextResponse.json(ephemeral("Publish this character's Showcase before sharing its profile."));
    const profileUrl = new URL(`/showcase/${character.slug}`, siteUrl(process.env.IRON_PATH_API_ORIGIN)).toString();
    return NextResponse.json({ type: 4, data: {
      content: `⚔️ **${character.name}'s Iron Path**`,
      embeds: [{ title: "RuneLite-verified character", url: profileUrl, color: 0xd5ad55,
        description: "View goals, Collection Log progress, skills, and recent activity.",
        fields: [
          { name: "Account", value: String(character.account_type), inline: true },
          { name: "Combat", value: String(character.combat_level), inline: true },
          { name: "Total level", value: Number(character.total_level).toLocaleString("en-GB"), inline: true },
        ], footer: { text: "Iron Path · Progress worth sharing" } }],
      components: [{ type: 1, components: [{ type: 2, style: 5, label: "View Iron Path", url: profileUrl }] }],
      allowed_mentions: { parse: [] },
    } });
  }

  if (command.name === "recent") {
    const { data } = await admin.from("achievement_events").select("public_id")
      .eq("character_id", character.id).order("occurred_at", { ascending: false }).limit(1).maybeSingle();
    if (!data) return NextResponse.json(ephemeral("No achievements have been recorded yet."));
    const achievement = await loadPublicAchievement(String(data.public_id));
    if (!achievement) return NextResponse.json(ephemeral("That achievement is no longer available."));
    return NextResponse.json({ type: 4, data: achievementDiscordMessage(achievement) });
  }

  return NextResponse.json(ephemeral("Unsupported Iron Path command."));
}

import type { NextResponse } from "next/server";
import type { CharacterSummary, RuneScapeAccountType } from "@/lib/types";

export const ACTIVE_CHARACTER_COOKIE = "iron-path-character";
export const MAX_CHARACTERS = 5;

export type CharacterSummaryRow = {
  id: string;
  name: string;
  slug: string;
  account_type: RuneScapeAccountType;
  combat_level: number;
  total_level: number;
  visibility: CharacterSummary["visibility"];
  last_synced_at: string | null;
  created_at: string;
};

export function characterSummary(row: CharacterSummaryRow): CharacterSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    accountType: row.account_type,
    combatLevel: Number(row.combat_level),
    totalLevel: Number(row.total_level),
    visibility: row.visibility,
    lastSyncedAt: row.last_synced_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function chooseCharacter(characters: CharacterSummary[], requestedSlug?: string, rememberedSlug?: string) {
  return characters.find((character) => character.slug === requestedSlug)
    ?? characters.find((character) => character.slug === rememberedSlug)
    ?? characters[0];
}

export function setActiveCharacterCookie(response: NextResponse, slug: string) {
  response.cookies.set(ACTIVE_CHARACTER_COOKIE, slug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function clearActiveCharacterCookie(response: NextResponse) {
  response.cookies.set(ACTIVE_CHARACTER_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

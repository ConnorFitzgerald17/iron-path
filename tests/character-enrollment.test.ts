import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ authenticatedUser: vi.fn(), ownedCharacter: vi.fn(), createAdminClient: vi.fn() }));

vi.mock("@/lib/server/app-auth", () => ({ authenticatedUser: mocks.authenticatedUser, ownedCharacter: mocks.ownedCharacter }));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: mocks.createAdminClient }));

import { POST } from "@/app/api/app/characters/route";
import { PATCH as updateVisibility } from "@/app/api/app/character/route";
import { CharacterEnrollment } from "@/components/character-enrollment";

const verifiedCharacter = {
  id: "character-1", name: "Iron Vale", slug: "iron-vale", accountType: "Ironman" as const,
  combatLevel: 88, totalLevel: 1500, visibility: "private" as const,
  lastSyncedAt: "2026-08-10T17:00:00Z", createdAt: "2026-08-10T16:59:00Z",
};

describe("RuneLite-verified character enrollment", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("still requires an authenticated Iron Path user", async () => {
    mocks.authenticatedUser.mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBe(401);
  });

  it("blocks the old unverified name-first creation endpoint", async () => {
    mocks.authenticatedUser.mockResolvedValue({ id: "user-1" });
    const response = await POST();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "runelite_verification_required" });
  });

  it("does not allow a legacy unsynced profile to become public", async () => {
    mocks.authenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.ownedCharacter.mockResolvedValue({ id: "character-1", last_synced_at: null });
    const request = new Request("http://localhost/api/app/character", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: "a4bf9ab0-5617-4c19-a5f1-a428babe7391", visibility: "public" }),
    });
    const response = await updateVisibility(request);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "runelite_verification_required" });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("waits for RuneLite and completes only after the verified snapshot", async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "ABCD-EFGH", expiresAt: new Date(Date.now() + 600_000).toISOString() }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "complete", character: verifiedCharacter }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(CharacterEnrollment, { onCreated }));
    expect(await screen.findByText("ABCD-EFGH")).not.toBeNull();
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(verifiedCharacter), { timeout: 3_000 });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PUT" });
  });
});

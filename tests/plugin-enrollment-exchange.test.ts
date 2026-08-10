import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createAdminClient: vi.fn(), isSupabaseConfigured: vi.fn(), signupsEnabled: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));
vi.mock("@/lib/server/feature-flags", () => ({ signupsEnabled: mocks.signupsEnabled }));

import { POST } from "@/app/api/plugin/v1/link/exchange/route";

function exchangeRequest(body: unknown) {
  return new Request("http://localhost/api/plugin/v1/link/exchange", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("plugin enrollment exchange", () => {
  beforeEach(() => {
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.signupsEnabled.mockReturnValue(true);
  });
  afterEach(() => vi.clearAllMocks());

  it("atomically creates a character and device from an unclaimed web code", async () => {
    const linkQuery = {
      select: vi.fn(), eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: { id: "link-1", character_id: null, user_id: "user-1", used_at: null, expires_at: new Date(Date.now() + 60_000).toISOString() },
      })),
    };
    linkQuery.select.mockReturnValue(linkQuery);
    linkQuery.eq.mockReturnValue(linkQuery);
    const claimSingle = vi.fn(async () => ({ data: { character_id: "character-1", device_id: "device-1" }, error: null }));
    const admin = {
      from: vi.fn(() => linkQuery),
      rpc: vi.fn(() => ({ single: claimSingle })),
    };
    mocks.createAdminClient.mockReturnValue(admin);

    const response = await POST(exchangeRequest({ code: "ABCD-EFGH", characterName: "Iron Vale", clientVersion: "0.4.0" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ characterId: "character-1", token: expect.stringMatching(/^ipd_/) });
    expect(admin.rpc).toHaveBeenCalledWith("claim_plugin_enrollment", expect.objectContaining({
      p_character_name: "Iron Vale",
      p_base_slug: "iron-vale",
      p_client_version: "0.4.0",
    }));
  });

  it("rejects an expired code before creating any profile", async () => {
    const linkQuery = {
      select: vi.fn(), eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: null })),
    };
    linkQuery.select.mockReturnValue(linkQuery);
    linkQuery.eq.mockReturnValue(linkQuery);
    const admin = { from: vi.fn(() => linkQuery), rpc: vi.fn() };
    mocks.createAdminClient.mockReturnValue(admin);

    const response = await POST(exchangeRequest({ code: "ABCD-EFGH", characterName: "Iron Vale" }));
    expect(response.status).toBe(401);
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it("rejects a previously issued first-character code while signups are closed", async () => {
    mocks.signupsEnabled.mockReturnValue(false);
    const linkQuery = {
      select: vi.fn(), eq: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: { id: "link-1", character_id: null, user_id: "user-1", used_at: null, expires_at: new Date(Date.now() + 60_000).toISOString() },
      })),
    };
    linkQuery.select.mockReturnValue(linkQuery);
    linkQuery.eq.mockReturnValue(linkQuery);
    const characterQuery = { select: vi.fn(), eq: vi.fn(async () => ({ count: 0, error: null })) };
    characterQuery.select.mockReturnValue(characterQuery);
    const admin = {
      from: vi.fn((table: string) => table === "characters" ? characterQuery : linkQuery),
      rpc: vi.fn(),
    };
    mocks.createAdminClient.mockReturnValue(admin);

    const response = await POST(exchangeRequest({ code: "ABCD-EFGH", characterName: "Iron Vale" }));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "signups_closed" });
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  signupsEnabled: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
  createClient: mocks.createClient,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));
vi.mock("@/lib/server/feature-flags", () => ({ signupsEnabled: mocks.signupsEnabled }));

import { POST } from "@/app/api/plugin/v1/link/code/route";

describe("signup enrollment guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.signupsEnabled.mockReturnValue(false);
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "user-1" } } })) },
    });
  });

  it("does not issue a first-character code while signups are closed", async () => {
    const characterQuery = { select: vi.fn(), eq: vi.fn(async () => ({ count: 0 })) };
    characterQuery.select.mockReturnValue(characterQuery);
    const admin = { from: vi.fn(() => characterQuery) };
    mocks.createAdminClient.mockReturnValue(admin);

    const response = await POST(new Request("http://localhost/api/plugin/v1/link/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "signups_closed" });
    expect(admin.from).toHaveBeenCalledTimes(1);
  });
});

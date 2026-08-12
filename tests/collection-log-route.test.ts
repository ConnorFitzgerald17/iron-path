import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateDevice: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/server/plugin-auth", () => ({ authenticateDevice: mocks.authenticateDevice }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
  isSupabaseConfigured: () => true,
}));

import { POST } from "@/app/api/plugin/v1/collection-log/route";

function request(recentItemIds: number[]) {
  return new Request("http://localhost/api/plugin/v1/collection-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      capturedAt: "2026-08-12T12:00:00.000Z",
      recentItemIds,
      sections: [{
        key: "bosses-abyssal-sire", category: "Bosses", name: "Abyssal Sire",
        obtainedCount: 1, totalCount: 1, capturedAt: "2026-08-12T12:00:00.000Z",
        slots: [{ itemId: 13262, quantity: 1, obtained: true, slotOrder: 0 }],
      }],
    }),
  });
}

describe("collection-log sync route", () => {
  beforeEach(() => mocks.authenticateDevice.mockResolvedValue({ characterId: "character-1", deviceId: "device-1" }));
  afterEach(() => vi.clearAllMocks());

  it("preserves the last captured overview when RuneLite cannot read recent items", async () => {
    const admin = { rpc: vi.fn(async () => ({ error: null })), from: vi.fn() };
    mocks.createAdminClient.mockReturnValue(admin);

    const response = await POST(request([]));

    expect(response.status).toBe(200);
    expect(admin.rpc).toHaveBeenCalledWith("ingest_collection_log_sync", expect.any(Object));
    expect(admin.from).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateDevice: vi.fn(),
  createAdminClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("@/lib/server/plugin-auth", () => ({ authenticateDevice: mocks.authenticateDevice }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

import { PATCH } from "@/app/api/plugin/v1/goals/[goalId]/route";

function request(body: unknown) {
  return new Request("http://localhost/api/plugin/v1/goals/goal-1", {
    method: "PATCH",
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function adminWithGoal(goal: { id: string } | null) {
  const query = {
    error: null,
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: goal })),
  };
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const admin = { from: vi.fn(() => query) };
  mocks.createAdminClient.mockReturnValue(admin);
  return { admin, query };
}

describe("plugin goal status route", () => {
  beforeEach(() => {
    mocks.authenticateDevice.mockResolvedValue({ deviceId: "device-1", characterId: "character-1" });
    mocks.isSupabaseConfigured.mockReturnValue(true);
  });

  afterEach(() => vi.clearAllMocks());

  it("rejects an invalid device token", async () => {
    mocks.authenticateDevice.mockResolvedValue(null);
    const response = await PATCH(request({ status: "complete" }), { params: Promise.resolve({ goalId: "goal-1" }) });
    expect(response.status).toBe(401);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects unsupported statuses", async () => {
    const response = await PATCH(request({ status: "paused" }), { params: Promise.resolve({ goalId: "goal-1" }) });
    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("does not update a goal outside the linked character", async () => {
    const { query } = adminWithGoal(null);
    const response = await PATCH(request({ status: "complete" }), { params: Promise.resolve({ goalId: "goal-1" }) });
    expect(response.status).toBe(404);
    expect(query.update).not.toHaveBeenCalled();
  });

  it("updates only status and timestamp for an owned goal", async () => {
    const { query } = adminWithGoal({ id: "goal-1" });
    const response = await PATCH(request({ status: "complete" }), { params: Promise.resolve({ goalId: "goal-1" }) });
    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledOnce();
    expect(query.update.mock.calls[0][0]).toEqual({ status: "complete", updated_at: expect.any(String) });
  });
});

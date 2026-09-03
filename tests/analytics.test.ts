import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: mocks.createAdminClient,
  createClient: mocks.createClient,
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

import { POST } from "@/app/api/analytics/track/route";
import { analyticsRange, isAnalyticsAdmin } from "@/lib/analytics/admin";

const validEvent = {
  eventId: "11111111-1111-4111-8111-111111111111",
  visitorId: "22222222-2222-4222-8222-222222222222",
  sessionId: "33333333-3333-4333-8333-333333333333",
  name: "goal_created",
  path: "/journal",
  properties: { device: "desktop", source: "Direct", goalKind: "quest" },
};

describe("private analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(true);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("authorizes only configured email addresses, case insensitively", () => {
    vi.stubEnv("ANALYTICS_ADMIN_EMAILS", " owner@example.com,second@example.com ");
    expect(isAnalyticsAdmin({ email: "OWNER@example.com" })).toBe(true);
    expect(isAnalyticsAdmin({ email: "reader@example.com" })).toBe(false);
    expect(isAnalyticsAdmin(null)).toBe(false);
  });

  it("allows only supported reporting ranges", () => {
    expect(analyticsRange("7")).toBe(7);
    expect(analyticsRange(["90"])).toBe(90);
    expect(analyticsRange("365")).toBe(30);
    expect(analyticsRange(undefined)).toBe(30);
  });

  it("derives the member identity from the authenticated server session", async () => {
    const insert = vi.fn(async () => ({ error: null }));
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: "authenticated-user" } } })) },
    });
    mocks.createAdminClient.mockReturnValue({ from: vi.fn(() => ({ insert })) });

    const response = await POST(new Request("http://localhost/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost" },
      body: JSON.stringify(validEvent),
    }));

    expect(response.status).toBe(204);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "authenticated-user",
      event_name: "goal_created",
      properties: { device: "desktop", source: "Direct", goalKind: "quest" },
    }));
  });

  it("rejects cross-origin and non-allowlisted event payloads", async () => {
    const crossOrigin = await POST(new Request("http://localhost/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: JSON.stringify(validEvent),
    }));
    expect(crossOrigin.status).toBe(403);

    const invalid = await POST(new Request("http://localhost/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost" },
      body: JSON.stringify({ ...validEvent, name: "email_exported" }),
    }));
    expect(invalid.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects requests without a browser origin", async () => {
    const response = await POST(new Request("http://localhost/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validEvent),
    }));
    expect(response.status).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

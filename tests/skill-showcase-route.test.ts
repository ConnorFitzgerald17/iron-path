import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticatedUser: vi.fn(),
  ownedCharacter: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/server/app-auth", () => ({
  authenticatedUser: mocks.authenticatedUser,
  ownedCharacter: mocks.ownedCharacter,
}));
vi.mock("@/lib/supabase/server", () => ({ createAdminClient: mocks.createAdminClient }));

import { PATCH } from "@/app/api/app/skill-showcase/route";

const characterId = "2c20680e-3492-4a91-973a-8e5f6620ce45";

function request(body: unknown) {
  return new Request("http://localhost/api/app/skill-showcase", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function adminClient() {
  const skillQuery = {
    select: vi.fn(), eq: vi.fn(), ilike: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: { skill: "Magic" }, error: null })),
  };
  skillQuery.select.mockReturnValue(skillQuery);
  skillQuery.eq.mockReturnValue(skillQuery);
  skillQuery.ilike.mockReturnValue(skillQuery);
  const showcaseQuery = {
    error: null,
    delete: vi.fn(), eq: vi.fn(), upsert: vi.fn(async () => ({ error: null })),
  };
  showcaseQuery.delete.mockReturnValue(showcaseQuery);
  showcaseQuery.eq.mockReturnValue(showcaseQuery);
  const admin = { from: vi.fn((table: string) => table === "character_skills" ? skillQuery : showcaseQuery) };
  mocks.createAdminClient.mockReturnValue(admin);
  return { admin, skillQuery, showcaseQuery };
}

describe("skill showcase route", () => {
  beforeEach(() => {
    mocks.authenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.ownedCharacter.mockResolvedValue({ id: characterId });
  });

  afterEach(() => vi.clearAllMocks());

  it("publishes all stats without requiring an individual skill lookup", async () => {
    const { admin, showcaseQuery } = adminClient();
    const response = await PATCH(request({ characterId, skill: "*", public: true }));

    expect(response.status).toBe(200);
    expect(admin.from).not.toHaveBeenCalledWith("character_skills");
    expect(showcaseQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({ skill_key: "*" }), expect.any(Object));
  });

  it("validates and persists an individual synced skill", async () => {
    const { skillQuery, showcaseQuery } = adminClient();
    const response = await PATCH(request({ characterId, skill: "Magic", public: true, sortOrder: 15 }));

    expect(response.status).toBe(200);
    expect(skillQuery.ilike).toHaveBeenCalledWith("skill", "Magic");
    expect(showcaseQuery.upsert).toHaveBeenCalledWith(expect.objectContaining({ skill_key: "magic", sort_order: 15 }), expect.any(Object));
  });

  it("rejects malformed skill names", async () => {
    const response = await PATCH(request({ characterId, skill: "%", public: true }));
    expect(response.status).toBe(400);
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});

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

import { PATCH } from "@/app/api/app/collection-showcase/route";

const characterId = "2c20680e-3492-4a91-973a-8e5f6620ce45";

function request(body: unknown) {
  return new Request("http://localhost/api/app/collection-showcase", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("collection showcase route", () => {
  beforeEach(() => {
    mocks.authenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.ownedCharacter.mockResolvedValue({ id: characterId });
  });
  afterEach(() => vi.clearAllMocks());

  it("enables the automatic recent collection shelf", async () => {
    const query = { update: vi.fn(), eq: vi.fn() };
    query.update.mockReturnValue(query);
    query.eq.mockResolvedValue({ error: null });
    const from = vi.fn(() => query);
    mocks.createAdminClient.mockReturnValue({ from });

    const response = await PATCH(request({ characterId, selectionType: "recent", public: true }));

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("characters");
    expect(query.update).toHaveBeenCalledWith({ show_recent_collections: true });
    expect(query.eq).toHaveBeenCalledWith("id", characterId);
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { IronPathApp } from "@/components/iron-path-app";
import { demoProfile } from "@/lib/demo-data";

describe("goal completion", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        removeItem: (key: string) => values.delete(key),
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("moves a goal to completed and allows it to be reopened", () => {
    render(createElement(IronPathApp));

    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));
    expect(screen.getByRole("button", { name: "Reopen goal" })).not.toBeNull();
    expect(screen.getAllByText("COMPLETED").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Reopen goal" }));
    expect(screen.getByRole("button", { name: "Mark complete" })).not.toBeNull();
  });

  it("sends connected completion as a status-only update", async () => {
    const profile = structuredClone(demoProfile);
    profile.id = "2c20680e-3492-4a91-973a-8e5f6620ce45";
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") return { ok: true, json: async () => ({ ok: true }) } as Response;
      return {
        ok: true,
        json: async () => ({ goals: profile.goals.map((goal) => ({ id: goal.id, status: goal.status ?? "active" })) }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    render(createElement(IronPathApp, { initialProfile: profile, mode: "connected" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark complete" }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH" && init.body)).toBe(true));
    const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH" && init.body)!;
    expect(JSON.parse(String(patchCall[1]?.body))).toEqual({ characterId: profile.id, status: "complete" });
  });
});

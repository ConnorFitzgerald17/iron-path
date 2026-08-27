import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { IronPathApp } from "@/components/iron-path-app";
import { demoProfile } from "@/lib/demo-data";

describe("dashboard how-to", () => {
  beforeEach(() => {
    const values = new Map([["iron-path-demo-profile-v1", JSON.stringify(structuredClone(demoProfile))]]);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  afterEach(cleanup);

  it("opens a concise quick-start guide from the dashboard", async () => {
    render(createElement(IronPathApp));

    fireEvent.click(await screen.findByRole("button", { name: "How to use Iron Path" }));

    expect(screen.getByRole("dialog", { name: "How to use Iron Path" })).not.toBeNull();
    expect(screen.getByText("Connect RuneLite")).not.toBeNull();
    expect(screen.getByText("Sync your progress")).not.toBeNull();
    expect(screen.getByText("Choose what comes next")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Close how-to" }));
    expect(screen.queryByRole("dialog", { name: "How to use Iron Path" })).toBeNull();
  });
});

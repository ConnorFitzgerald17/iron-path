import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { IronPathApp } from "@/components/iron-path-app";
import { demoProfile } from "@/lib/demo-data";

describe("level grinds", () => {
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

  it("shows only level grinds in Next steps", async () => {
    render(createElement(IronPathApp));

    const heading = await screen.findByText("NEXT STEPS");
    const panel = heading.closest("section")!;
    expect(within(panel).getByText("70 Smithing")).not.toBeNull();
    expect(within(panel).queryByText("Goutweed")).toBeNull();
    expect(within(panel).queryByText("Legends' Quest")).toBeNull();
  });

  it("creates a plain level grind and offers banked XP as a beta add-on", async () => {
    render(createElement(IronPathApp));
    fireEvent.click(await screen.findByRole("button", { name: "Add goal" }));
    fireEvent.click(screen.getByRole("button", { name: /^Level grind$/i }));

    expect(screen.getByText("Banked XP is in beta")).not.toBeNull();
    fireEvent.change(screen.getByLabelText("Skill"), { target: { value: "Herblore" } });
    const betaToggle = screen.getByRole("button", { name: "Add banked XP" });
    expect(betaToggle.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Add level grind" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("REMAINING")).not.toBeNull();
    expect(screen.queryByText("AFTER BANK")).toBeNull();
    expect(screen.getByText("Banked XP is in beta")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Add banked XP" }));
    await waitFor(() => expect(screen.getByText("AFTER BANK")).not.toBeNull());
    expect(screen.getByRole("button", { name: "Remove banked XP" })).not.toBeNull();
  });
});

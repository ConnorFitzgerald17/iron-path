import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { IronPathApp } from "@/components/iron-path-app";
import { demoProfile } from "@/lib/demo-data";

describe("showcase preview", () => {
  beforeEach(() => {
    const profile = structuredClone(demoProfile);
    profile.goals = profile.goals.map((goal) => ({ ...goal, public: false }));
    const values = new Map([["iron-path-demo-profile-v1", JSON.stringify(profile)]]);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  afterEach(cleanup);

  it("shows collection progress without a goals empty state", async () => {
    render(createElement(IronPathApp));
    fireEvent.click(screen.getByRole("button", { name: "Showcase" }));

    await waitFor(() => expect(document.querySelector(".showcase-preview")).not.toBeNull());

    expect(document.querySelector(".public-goals")).toBeNull();
    expect(document.querySelector(".collection-showcase")).not.toBeNull();
    expect(document.querySelectorAll(".collection-recent-shelf article")).toHaveLength(3);
    expect(document.querySelector(".collection-recent-shelf")?.textContent).not.toContain("1×");
    expect(document.querySelector(".collection-recent-shelf")?.textContent).not.toContain("Tombs of Amascut");
    expect(document.querySelectorAll(".skill-showcase article")).toHaveLength(3);
    expect(screen.queryByText("Nothing showcased yet")).toBeNull();
    expect(document.querySelector(".showcase-preview")?.textContent).toContain("12/32");
    expect(screen.getAllByText("7/25").length).toBeGreaterThan(0);
    expect(screen.getByText("COMBAT LEVEL")).not.toBeNull();
    expect(screen.getByText("104")).not.toBeNull();
  });

  it("can hide the automatic latest-three collection shelf", async () => {
    render(createElement(IronPathApp));
    fireEvent.click(screen.getByRole("button", { name: "Showcase" }));

    const recentToggle = await screen.findByRole("button", { name: /Show recent collection items/i });
    expect(recentToggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(recentToggle);

    expect(recentToggle.getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector(".collection-recent-shelf")).toBeNull();
  });

  it("can publish all synced stats from one control", async () => {
    render(createElement(IronPathApp));
    fireEvent.click(screen.getByRole("button", { name: "Showcase" }));

    const showAll = await screen.findByRole("button", { name: /Show all stats/i });
    fireEvent.click(showAll);

    expect(showAll.getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelectorAll(".skill-showcase article")).toHaveLength(demoProfile.skills.length);
  });

  it("marks completed collection sections as green logged", async () => {
    const profile = structuredClone(demoProfile);
    profile.collectionLog[0].obtainedCount = profile.collectionLog[0].totalCount;
    window.localStorage.setItem("iron-path-demo-profile-v1", JSON.stringify(profile));

    render(createElement(IronPathApp));
    fireEvent.click(screen.getByRole("button", { name: "Showcase" }));

    await waitFor(() => expect(document.querySelector(".collection-section.green-logged")).not.toBeNull());
  });
});

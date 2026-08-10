import { describe, expect, it } from "vitest";
import { siteUrl } from "@/lib/site-url";

describe("site URL configuration", () => {
  it("adds HTTPS to a bare production domain", () => {
    expect(siteUrl("ironpathosrs.com").href).toBe("https://ironpathosrs.com/");
  });

  it("preserves an explicit HTTP or HTTPS origin", () => {
    expect(siteUrl("http://localhost:3000").href).toBe("http://localhost:3000/");
    expect(siteUrl("https://ironpathosrs.com").href).toBe("https://ironpathosrs.com/");
  });

  it("falls back safely when the value is missing or invalid", () => {
    expect(siteUrl(undefined).href).toBe("http://localhost:3000/");
    expect(siteUrl("://").href).toBe("http://localhost:3000/");
  });
});

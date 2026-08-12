import { describe, expect, it } from "vitest";
import { isLoopbackUrl } from "@/lib/local-development";

describe("local development guards", () => {
  it("accepts loopback Supabase URLs", () => {
    expect(isLoopbackUrl("http://localhost:54321")).toBe(true);
    expect(isLoopbackUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLoopbackUrl("http://[::1]:54321")).toBe(true);
  });

  it("rejects hosted and malformed URLs", () => {
    expect(isLoopbackUrl("https://project.supabase.co")).toBe(false);
    expect(isLoopbackUrl("not-a-url")).toBe(false);
    expect(isLoopbackUrl(undefined)).toBe(false);
  });
});

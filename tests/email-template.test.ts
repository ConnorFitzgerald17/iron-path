import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("magic-link email", () => {
  it("registers the branded template for local Supabase", () => {
    const config = projectFile("supabase/config.toml");

    expect(config).toContain("[auth.email.template.magic_link]");
    expect(config).toContain('subject = "Sign in to Iron Path"');
    expect(config).toContain(
      'content_path = "./supabase/templates/magic-link.html"',
    );
  });

  it("keeps the Supabase confirmation link in the branded email", () => {
    const template = projectFile("supabase/templates/magic-link.html");

    expect(template).toContain("Iron Path");
    expect(template.match(/{{ \.ConfirmationURL }}/g)).toHaveLength(3);
    expect(template).not.toMatch(/<script|<img/i);
  });
});

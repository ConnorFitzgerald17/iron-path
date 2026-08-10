import { describe, expect, it } from "vitest";
import { featureEnabled } from "@/lib/feature-flags";

describe("signup feature flag", () => {
  it("defaults closed", () => {
    expect(featureEnabled(undefined)).toBe(false);
  });

  it.each(["1", "true", "TRUE", "yes", "on"])("opens for %s", (value) => {
    expect(featureEnabled(value)).toBe(true);
  });

  it.each(["0", "false", "off", "unexpected"])("stays closed for %s", (value) => {
    expect(featureEnabled(value)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { shouldRefreshDeviceLastSeen } from "@/lib/server/plugin-auth";

describe("plugin authentication activity", () => {
  it("throttles last-seen writes for frequent goal polling", () => {
    const now = Date.parse("2026-08-10T17:00:00Z");
    expect(shouldRefreshDeviceLastSeen(null, now)).toBe(true);
    expect(shouldRefreshDeviceLastSeen("2026-08-10T16:59:00Z", now)).toBe(false);
    expect(shouldRefreshDeviceLastSeen("2026-08-10T16:54:00Z", now)).toBe(true);
  });
});

"use client";

import type { AnalyticsEventName, AnalyticsEventProperties } from "@/lib/analytics/events";

const VISITOR_KEY = "iron-path-analytics-visitor";
const SESSION_KEY = "iron-path-analytics-session";
const SOURCE_KEY = "iron-path-analytics-source";

function storedId(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  storage.setItem(key, value);
  return value;
}

function source() {
  const existing = window.sessionStorage.getItem(SOURCE_KEY);
  if (existing) return existing;
  let value = "Direct";
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.origin !== window.location.origin) value = referrer.hostname.replace(/^www\./, "");
    } catch {
      // Invalid referrers are intentionally treated as direct traffic.
    }
  }
  window.sessionStorage.setItem(SOURCE_KEY, value);
  return value;
}

function device(): NonNullable<AnalyticsEventProperties["device"]> {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1100) return "tablet";
  return "desktop";
}

export function trackEvent(name: AnalyticsEventName, properties: AnalyticsEventProperties = {}) {
  if (typeof window === "undefined" || window.location.pathname === "/analytics" || navigator.doNotTrack === "1") return;
  try {
    const payload = JSON.stringify({
      eventId: crypto.randomUUID(),
      visitorId: storedId(window.localStorage, VISITOR_KEY),
      sessionId: storedId(window.sessionStorage, SESSION_KEY),
      name,
      path: window.location.pathname,
      properties: { device: device(), source: source(), ...properties },
    });
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Analytics must never interrupt the product experience (including when
    // storage is disabled by the browser).
  }
}

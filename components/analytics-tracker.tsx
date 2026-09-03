"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics/client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === "/analytics" || lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackEvent("page_view");
  }, [pathname]);

  return null;
}

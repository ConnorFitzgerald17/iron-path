import "server-only";
import { featureEnabled } from "@/lib/feature-flags";

export function signupsEnabled() {
  return featureEnabled(process.env.FF_SIGNUPS_ENABLED);
}

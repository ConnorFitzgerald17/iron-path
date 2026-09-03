import { LoginForm } from "@/components/login-form";
import { signupsEnabled } from "@/lib/server/feature-flags";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const requested = (await searchParams).next;
  const value = Array.isArray(requested) ? requested[0] : requested;
  const next = value?.startsWith("/") && !value.startsWith("//") ? value : "/journal";
  return <LoginForm allowSignups={signupsEnabled()} next={next} />;
}

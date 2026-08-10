import { LoginForm } from "@/components/login-form";
import { signupsEnabled } from "@/lib/server/feature-flags";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm allowSignups={signupsEnabled()} />;
}

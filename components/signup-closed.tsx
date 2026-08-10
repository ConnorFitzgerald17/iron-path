"use client";

import { LockKeyhole, LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function SignupClosed() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return <main className="onboarding-page">
    <section className="onboarding-card signup-closed-card">
      <span className="brand-mark" aria-hidden="true" />
      <small>EARLY ACCESS</small>
      <h1>The gate is closed.</h1>
      <p>New-user signups are currently disabled. New journals will open after the Iron Path RuneLite plugin is approved.</p>
      <div className="signup-closed-seal"><LockKeyhole size={25} /><span><strong>Enrollment paused</strong><small>Existing verified journals remain available.</small></span></div>
      <button className="signup-closed-action" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button>
      <footer><Shield size={14} /> No showcase URL is reserved until RuneLite verification is enabled.</footer>
    </section>
  </main>;
}

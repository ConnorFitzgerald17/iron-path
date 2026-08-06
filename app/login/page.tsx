"use client";

import { ArrowLeft, Mail, MessageCircle, Shield } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  async function signInDiscord() {
    if (!configured) return setMessage("Add Supabase credentials to enable production sign-in.");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: `${location.origin}/auth/callback` } });
  }

  async function signInEmail(event: FormEvent) {
    event.preventDefault();
    if (!configured) return setMessage("Demo mode is active—return to the journal to explore without an account.");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setMessage(error ? error.message : "Check your inbox for the sign-in link.");
  }

  return (
    <main className="auth-page">
      <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to journal</Link>
      <section className="auth-card">
        <span className="brand-mark"><span />IP</span>
        <small>THE ROAD REMEMBERS</small>
        <h1>Return to your path.</h1>
        <p>Sync every iron account, keep every grind honest, and choose the trophies worth showing.</p>
        <button className="discord-button" onClick={signInDiscord}><MessageCircle size={18} /> Continue with Discord</button>
        <div className="auth-divider"><span>or use email</span></div>
        <form onSubmit={signInEmail}>
          <label><Mail size={15} /><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <button>Send magic link</button>
        </form>
        {message && <div className="auth-message">{message}</div>}
        <footer><Shield size={14} /> Iron Path never receives your Jagex credentials.</footer>
      </section>
    </main>
  );
}

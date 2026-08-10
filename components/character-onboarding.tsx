"use client";

import { ArrowRight, Shield, Swords } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function CharacterOnboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/app/characters", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setSaving(false);
      setError(body.error ?? "Could not create your character.");
      return;
    }
    router.push(`/?character=${encodeURIComponent(body.character.slug)}`);
    router.refresh();
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <span className="brand-mark"><span />IP</span>
        <small>FIRST ENTRY</small>
        <h1>Name the path.</h1>
        <p>Create the account you want to track. RuneLite will identify its account mode, levels, quests, and items when you link it.</p>
        <form onSubmit={submit}>
          <label><span>RuneScape name</span><input autoFocus required minLength={1} maxLength={12} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your RSN" /></label>
          <button disabled={saving}><Swords size={17} /> {saving ? "Opening journal…" : "Create journal"} <ArrowRight size={16} /></button>
        </form>
        {error && <div className="form-error">{error}</div>}
        <footer><Shield size={14} /> This profile stays private until you publish it.</footer>
      </section>
    </main>
  );
}

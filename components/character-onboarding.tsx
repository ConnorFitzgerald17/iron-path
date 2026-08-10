"use client";

import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import type { CharacterSummary } from "@/lib/types";
import { CharacterEnrollment } from "./character-enrollment";

export function CharacterOnboarding() {
  const router = useRouter();

  function verified(character: CharacterSummary) {
    router.push(`/?character=${encodeURIComponent(character.slug)}`);
    router.refresh();
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-card">
        <span className="brand-mark" aria-hidden="true" />
        <small>VERIFY YOUR FIRST ENTRY</small>
        <h1>Prove the path.</h1>
        <p>Connect RuneLite before the journal is created. The logged-in character supplies the RSN, account mode, levels, quests, and items—so nobody else can claim its showcase URL.</p>
        <CharacterEnrollment onCreated={verified} />
        <footer><Shield size={14} /> Your verified profile stays private until you publish it.</footer>
      </section>
    </main>
  );
}

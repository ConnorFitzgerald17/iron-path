import Link from "next/link";
import { ArrowLeft, MessageCircle, Shield } from "lucide-react";
import { DiscordLinkForm } from "@/components/discord-link-form";

export const dynamic = "force-dynamic";

export default async function DiscordLinkPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <main className="auth-page discord-link-page">
    <Link href="/" className="auth-back"><ArrowLeft size={15} /> Back to journal</Link>
    <section className="auth-card">
      <span className="discord-link-icon"><MessageCircle size={30} /></span>
      <small>CLAN ACHIEVEMENTS</small>
      <h1>Connect Discord.</h1>
      <p>Link your Discord identity to your RuneLite-verified Iron Path characters. Your Jagex credentials are never involved.</p>
      {token ? <DiscordLinkForm token={token} /> : <div className="discord-link-result"><strong>This link is incomplete.</strong><p>Run <code>/ironpath link</code> in Discord to create a fresh connection.</p></div>}
      <footer><Shield size={14} /> Links expire after ten minutes and can only be used once.</footer>
    </section>
  </main>;
}


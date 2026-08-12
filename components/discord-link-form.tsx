"use client";

import Link from "next/link";
import { useState } from "react";

export function DiscordLinkForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "auth" | "error">("idle");

  async function connect() {
    setState("working");
    const response = await fetch("/api/app/discord/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (response.ok) return setState("done");
    setState(response.status === 401 ? "auth" : "error");
  }

  if (state === "done") return <div className="discord-link-result"><strong>Discord connected.</strong><p>Return to Discord and run <code>/ironpath join</code> in your clan server.</p></div>;
  if (state === "auth") return <div className="discord-link-result"><strong>Sign in first.</strong><p>Sign in to Iron Path, then return to this link before it expires.</p><Link href="/login">Sign in to Iron Path</Link></div>;
  return <>
    <button className="discord-connect-button" disabled={state === "working"} onClick={connect}>{state === "working" ? "Connecting…" : "Connect Discord"}</button>
    {state === "error" && <p className="discord-link-error">This link has expired or was already used. Run <code>/ironpath link</code> again.</p>}
  </>;
}


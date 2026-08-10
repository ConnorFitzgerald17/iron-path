"use client";

import { Link2, LoaderCircle, RefreshCw, Shield, Unplug } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CharacterSummary } from "@/lib/types";

type EnrollmentStatus = "issuing" | "waiting" | "syncing";

function enrollmentError(error?: string) {
  if (error === "signups_closed") return "New character enrollment is paused until the RuneLite plugin is approved.";
  if (error === "character_limit") return "You already have five verified characters.";
  if (error === "code_expired") return "That code expired before RuneLite connected.";
  if (error === "unauthorized") return "Your session expired. Sign in again to continue.";
  return "Could not verify a RuneLite character. Generate a new code and try again.";
}

export function CharacterEnrollment({ onCreated }: { onCreated: (character: CharacterSummary) => void }) {
  const onCreatedRef = useRef(onCreated);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [remaining, setRemaining] = useState("10:00");
  const [status, setStatus] = useState<EnrollmentStatus>("issuing");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { onCreatedRef.current = onCreated; }, [onCreated]);

  const requestCode = useCallback(async () => {
    try {
      const response = await fetch("/api/plugin/v1/link/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({})) as { code?: string; expiresAt?: string; error?: string };
      if (!response.ok || !body.code || !body.expiresAt) {
        setError(enrollmentError(body.error));
        return;
      }
      setCode(body.code);
      setExpiresAt(body.expiresAt);
      setStatus("waiting");
    } catch {
      setError(enrollmentError());
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void requestCode(), 0);
    return () => window.clearTimeout(timer);
  }, [requestCode]);

  const retry = () => {
    setStatus("issuing");
    setError("");
    setCode("");
    setCopied(false);
    void requestCode();
  };

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(`${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  useEffect(() => {
    if (!code) return;
    let stopped = false;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const response = await fetch("/api/plugin/v1/link/code", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const body = await response.json().catch(() => ({})) as { status?: "waiting" | "syncing" | "complete"; character?: CharacterSummary; error?: string };
        if (stopped) return;
        if (!response.ok) {
          setError(enrollmentError(body.error));
          return;
        }
        if (body.status === "complete" && body.character) {
          stopped = true;
          setCode("");
          onCreatedRef.current(body.character);
          return;
        }
        setStatus(body.status === "syncing" ? "syncing" : "waiting");
        timer = window.setTimeout(() => void poll(), 1800);
      } catch {
        if (!stopped) setError(enrollmentError());
      }
    };
    timer = window.setTimeout(() => void poll(), 900);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [code]);

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    setCopied(true);
  };

  return <div className="character-enrollment">
    <div className="link-illustration"><span><Unplug size={26} /></span><i /><span><Link2 size={26} /></span></div>
    <ol className="link-steps">
      <li><b>1</b><span>Log into the character you want to claim in RuneLite.</span></li>
      <li><b>2</b><span>Paste this code into the Iron Path plugin&apos;s <strong>Linking code</strong> setting.</span></li>
      <li><b>3</b><span>Click <strong>Connect</strong> in the plugin. Your verified profile will be created automatically.</span></li>
    </ol>
    <button className="link-code" disabled={!code} onClick={() => void copyCode()}>
      <small>VERIFICATION CODE · EXPIRES IN {remaining}</small>
      <strong>{code || (error ? "UNAVAILABLE" : "GENERATING…")}</strong>
      <span>{copied ? "Copied" : code ? "Click to copy" : "Preparing a secure code"}</span>
    </button>
    {!error && <div className={`enrollment-state enrollment-state--${status}`}>
      <LoaderCircle className="spin" size={14} />
      {status === "syncing" ? "RuneLite verified. Importing the first snapshot…" : status === "issuing" ? "Generating a verification code…" : "Waiting for RuneLite to verify the character…"}
    </div>}
    {error && <div className="form-error">{error}</div>}
    {error && <button className="enrollment-retry" onClick={retry}><RefreshCw size={13} /> Generate a new code</button>}
    <p className="security-note"><Shield size={15} /> A journal and showcase URL are created only after RuneLite proves the logged-in character name.</p>
  </div>;
}

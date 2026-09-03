"use client";

import {
  BarChart3, BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, ExternalLink,
  Copy, Eye, EyeOff, Gem, LayoutDashboard, Link2, LoaderCircle, LockKeyhole,
  LogOut, Menu, Minus, Plus, RefreshCw, Search, Settings,
  Shield, Sparkles, Target, Trash2, Trophy, Unplug, UserRound, X, Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { bankedXp, calculateBankedPlan, compactNumber, fullNumber, grindProgress, ownedQuantity, questReadiness, skillProgress, xpForLevel } from "@/lib/calculations";
import { accountTypeLabel } from "@/lib/character-display";
import { demoProfile, quickAddGoals } from "@/lib/demo-data";
import { skillIcon } from "@/lib/icons";
import { createClient as createBrowserClient } from "@/lib/supabase/browser";
import type { BankedXpGoal, CharacterProfile, CharacterSummary, CharacterSyncState, CollectionLogDisplayMode, Goal, GrindGoal, QuestGoal, QuestState, SkillGoal } from "@/lib/types";
import { mergeCharacterSyncState } from "@/lib/sync-state";
import { bankedMethodsForSkill, defaultMethodIds, methodsForSkill } from "@/lib/xp-catalog";
import { questRecommendations, skillGoalFromRecommendation, type QuestRecommendation } from "@/lib/recommendations";
import { skillShowcaseKey, sortedSkills, visibleShowcaseSkills } from "@/lib/skill-showcase";
import { ItemImage } from "./item-image";
import { CollectionLogShowcase } from "./collection-log-showcase";
import { SkillShowcase } from "./skill-showcase";
import { CharacterEnrollment } from "./character-enrollment";
import { trackEvent } from "@/lib/analytics/client";

const STORAGE_KEY = "iron-path-demo-profile-v1";

function readProfile(): CharacterProfile {
  if (typeof window === "undefined") return demoProfile;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return demoProfile;
    const parsed = JSON.parse(value) as CharacterProfile;
    const collectionLog = parsed.collectionLog ?? [];
    const collectionLogTotals = parsed.collectionLogTotals ?? collectionLog.reduce((totals, section) => ({
      obtainedCount: totals.obtainedCount + section.obtainedCount,
      totalCount: totals.totalCount + section.totalCount,
    }), { obtainedCount: 0, totalCount: 0 });
    return { ...parsed, collectionLog, collectionLogTotals, recentCollections: parsed.recentCollections ?? [], showRecentCollections: parsed.showRecentCollections ?? false, killCounts: parsed.killCounts ?? [], skillShowcase: parsed.skillShowcase ?? { all: false, skills: [] } };
  } catch {
    return demoProfile;
  }
}

function timeAgo(iso?: string) {
  if (!iso) return "Never synced";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function characterInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "IP";
}

function goalIcon(goal: Goal) {
  if (goal.kind === "quest") return <BookOpen size={16} />;
  if (goal.kind === "grind") return <Target size={16} />;
  return <Zap size={16} />;
}

function goalMeta(goal: Goal, profile: CharacterProfile) {
  if (goal.status === "complete") return { label: "Complete", percent: 100 };
  if (goal.kind === "quest") {
    const skills = Object.fromEntries(profile.skills.map((skill) => [skill.skill, skill.level]));
    const value = questReadiness(goal, profile.items, skills);
    return { label: `${value.ready}/${value.total} ready`, percent: value.percent };
  }
  if (goal.kind === "grind") {
    const value = grindProgress(goal);
    return { label: `${fullNumber(value.kc)} kc`, percent: Math.min(100, value.rateProgress) };
  }
  if (goal.kind === "skill") {
    const value = skillProgress(goal);
    return { label: `${fullNumber(value.remaining)} xp left`, percent: value.percent };
  }
  const value = bankedXp(goal);
  return { label: `Level ${value.projectedLevel} banked`, percent: value.percent };
}

export function IronPathApp({ initialProfile, characters = [], mode = "demo", showAnalytics = false }: { initialProfile?: CharacterProfile; characters?: CharacterSummary[]; mode?: "demo" | "connected"; showAnalytics?: boolean }) {
  const seed = initialProfile ?? demoProfile;
  const connected = mode === "connected";
  const router = useRouter();
  const [profile, setProfile] = useState<CharacterProfile>(seed);
  const [selectedId, setSelectedId] = useState(seed.goals.find((goal) => goal.status !== "complete")?.id ?? seed.goals[0]?.id ?? "");
  const [mobileNav, setMobileNav] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(connected);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [characterMenuOpen, setCharacterMenuOpen] = useState(false);
  const [characterCreateOpen, setCharacterCreateOpen] = useState(false);
  const [characterList, setCharacterList] = useState(characters);
  const [characterBusy, setCharacterBusy] = useState("");
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const pendingGoalStatuses = useRef(new Set<string>());
  const collectionMarker = useRef(seed.collectionLogUpdatedAt);

  // This is deliberately client-only: localStorage cannot be read during the server render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (connected) return;
    const stored = readProfile();
    setProfile(stored);
    setSelectedId(stored.goals.find((goal) => goal.status !== "complete")?.id ?? stored.goals[0]?.id ?? "");
    setHydrated(true);
  }, [connected]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated && !connected) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile, hydrated, connected]);

  useEffect(() => {
    if (!connected) return;
    let active = true;
    const refreshSyncState = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const collectionAfter = collectionMarker.current ? `?collectionAfter=${encodeURIComponent(collectionMarker.current)}` : "";
        const response = await fetch(`/api/app/characters/${encodeURIComponent(profile.id)}/sync-state${collectionAfter}`);
        if (!response.ok || !active) return;
        const body = await response.json().catch(() => null) as CharacterSyncState | null;
        if (!body?.character) return;
        collectionMarker.current = body.collectionLogUpdatedAt;
        setProfile((current) => {
          const currentStatuses = new Map(current.goals.map((goal) => [goal.id, goal.status]));
          const merged = mergeCharacterSyncState(current, body);
          return {
            ...merged,
            goals: merged.goals.map((goal) => pendingGoalStatuses.current.has(goal.id) ? { ...goal, status: currentStatuses.get(goal.id) } : goal),
          };
        });
        setCharacterList((current) => current.map((character) => character.id === body.character.id
          ? { ...character, ...body.character, createdAt: character.createdAt }
          : character));
      } catch {
        // The next interval or focus event retries transient sync-state failures.
      }
    };
    const onFocus = () => void refreshSyncState();
    const onVisibility = () => { if (document.visibilityState === "visible") void refreshSyncState(); };
    const interval = window.setInterval(() => void refreshSyncState(), 15_000);
    void refreshSyncState();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [connected, profile.id]);

  useEffect(() => {
    if (!connected) return;
    void fetch(`/api/app/characters/${encodeURIComponent(profile.id)}`, { method: "PATCH" });
  }, [connected, profile.id]);

  const selected = profile.goals.find((goal) => goal.id === selectedId) ?? profile.goals[0];
  const matchingGoals = profile.goals.filter((goal) => goal.title.toLowerCase().includes(query.toLowerCase()));
  const activeGoals = matchingGoals.filter((goal) => goal.status !== "complete");
  const completedGoals = matchingGoals.filter((goal) => goal.status === "complete");
  const recommendations = questRecommendations(profile).filter((recommendation) => recommendation.kind === "skill").slice(0, 5);

  const persistGoal = (goal: Goal) => {
    if (!connected) return;
    const existing = saveTimers.current.get(goal.id);
    if (existing) clearTimeout(existing);
    setSaving(true);
    saveTimers.current.set(goal.id, setTimeout(async () => {
      const response = await fetch(`/api/app/goals/${goal.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: profile.id, goal }),
      });
      saveTimers.current.delete(goal.id);
      setSaving(saveTimers.current.size > 0);
      if (!response.ok) setNotice("That change could not be saved. Try again.");
    }, 300));
  };

  const updateGoal = (goalId: string, mutate: (goal: Goal) => Goal) => {
    setProfile((current) => {
      const nextGoal = mutate(current.goals.find((goal) => goal.id === goalId)!);
      persistGoal(nextGoal);
      return { ...current, goals: current.goals.map((goal) => goal.id === goalId ? nextGoal : goal) };
    });
  };

  const updateGoalStatus = async (goalId: string, status: NonNullable<Goal["status"]>) => {
    if (pendingGoalStatuses.current.has(goalId)) return;
    const previous = profile.goals.find((goal) => goal.id === goalId)?.status ?? "active";
    setProfile((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, status } : goal) }));
    if (!connected) {
      trackEvent(status === "complete" ? "goal_completed" : "goal_reopened", { goalKind: profile.goals.find((goal) => goal.id === goalId)?.kind });
      return;
    }

    pendingGoalStatuses.current.add(goalId);
    setSaving(true);
    let saved = false;
    try {
      const response = await fetch(`/api/app/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: profile.id, status }),
      });
      saved = response.ok;
    } catch {
      saved = false;
    } finally {
      pendingGoalStatuses.current.delete(goalId);
      setSaving(saveTimers.current.size > 0);
    }
    if (!saved) {
      setProfile((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, status: previous } : goal) }));
      setNotice("The goal status could not be saved. Try again.");
    } else {
      trackEvent(status === "complete" ? "goal_completed" : "goal_reopened", { goalKind: profile.goals.find((goal) => goal.id === goalId)?.kind });
    }
  };

  const addGoal = async (goal: Goal) => {
    let created = { ...goal, status: goal.status ?? "active" } as Goal;
    if (connected) {
      setSaving(true);
      const response = await fetch("/api/app/goals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: profile.id, goal: created }),
      });
      const body = await response.json().catch(() => ({}));
      setSaving(false);
      if (!response.ok) {
        setNotice(body.error ?? "Could not add that goal.");
        return;
      }
      created = body.goal as Goal;
    }
    setProfile((current) => ({ ...current, goals: [...current.goals, created] }));
    trackEvent("goal_created", { goalKind: created.kind });
    setSelectedId(created.id);
    setAddOpen(false);
  };

  const followRecommendation = async (recommendation: QuestRecommendation) => {
    if (recommendation.existingGoalId) {
      const existing = profile.goals.find((goal) => goal.id === recommendation.existingGoalId);
      if (existing?.kind === "skill" && !existing.sourceGoals.some((source) => source.goalId === recommendation.sourceGoalId)) {
        updateGoal(existing.id, () => ({ ...existing, sourceGoals: [...existing.sourceGoals, { goalId: recommendation.sourceGoalId, title: recommendation.sourceGoalTitle, requiredLevel: recommendation.targetLevel ?? existing.targetLevel }] }));
      }
      setSelectedId(recommendation.existingGoalId);
      setShowcaseMode(false);
      return;
    }
    if (recommendation.kind === "skill") {
      await addGoal(skillGoalFromRecommendation(recommendation, profile));
      return;
    }
    if (recommendation.kind === "quest") {
      if (!connected) {
        const bundled = quickAddGoals.find((goal) => goal.kind === "quest" && goal.title.toLowerCase() === recommendation.quest?.toLowerCase());
        if (bundled) await addGoal(bundled);
        else setNotice("Connect the Wiki catalog to add this prerequisite quest.");
        return;
      }
      const response = await fetch(`/api/app/catalog?kind=quest&q=${encodeURIComponent(recommendation.quest ?? "")}`);
      const body = await response.json().catch(() => ({ results: [] })) as { results?: Goal[] };
      const match = body.results?.find((goal) => goal.kind === "quest" && goal.title.toLowerCase() === recommendation.quest?.toLowerCase());
      if (match) await addGoal(match);
      else setNotice("That prerequisite was not found in the current Wiki catalog.");
      return;
    }
    setAddOpen(true);
    setNotice(`Search item grinds for ${recommendation.itemName}.`);
  };

  const createSkillGoal = async (source: QuestGoal, skill: string, targetLevel: number) => {
    const recommendation: QuestRecommendation = {
      id: `skill:${skill}:${targetLevel}`, kind: "skill", title: `${targetLevel} ${skill}`, detail: `Required for ${source.title}`,
      sourceGoalId: source.id, sourceGoalTitle: source.title, skill, targetLevel, rank: 0,
    };
    const existing = profile.goals.find((goal) => goal.kind === "skill" && goal.skill.toLowerCase() === skill.toLowerCase() && goal.targetLevel >= targetLevel);
    if (existing) return setSelectedId(existing.id);
    await addGoal(skillGoalFromRecommendation(recommendation, profile));
  };

  const updateCollectionSelection = (sectionKey: string, selectionType: "section" | "item", value: boolean, displayMode: CollectionLogDisplayMode, itemId?: number) => {
    setProfile((current) => ({
      ...current,
      collectionLog: current.collectionLog.map((section) => section.key !== sectionKey ? section : selectionType === "section"
        ? { ...section, public: value, displayMode }
        : { ...section, slots: section.slots.map((slot) => slot.itemId === itemId ? { ...slot, public: value } : slot) }),
    }));
    if (connected) void fetch("/api/app/collection-showcase", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: profile.id, selectionType, sectionKey, itemId, public: value, displayMode }),
    }).then((response) => { if (!response.ok) setNotice("Collection showcase settings could not be saved."); });
  };

  const updateSkillShowcase = (skill: string, value: boolean, sortOrder = 0) => {
    const skillKey = skill === "*" ? "*" : skillShowcaseKey(skill);
    setProfile((current) => ({
      ...current,
      skillShowcase: skillKey === "*"
        ? { ...current.skillShowcase, all: value }
        : {
          ...current.skillShowcase,
          skills: value
            ? [...new Set([...current.skillShowcase.skills, skillKey])]
            : current.skillShowcase.skills.filter((selected) => selected !== skillKey),
        },
    }));
    if (connected) void fetch("/api/app/skill-showcase", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: profile.id, skill, public: value, sortOrder }),
    }).then((response) => { if (!response.ok) setNotice("Stat showcase settings could not be saved."); });
  };

  const updateRecentCollectionsShowcase = (value: boolean) => {
    setProfile((current) => ({ ...current, showRecentCollections: value }));
    if (connected) void fetch("/api/app/collection-showcase", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: profile.id, selectionType: "recent", public: value }),
    }).then((response) => { if (!response.ok) setNotice("Recent Collection Log settings could not be saved."); });
  };

  const updateManual = async (body: Record<string, unknown>) => {
    if (!connected) return;
    setSaving(true);
    const response = await fetch("/api/app/manual", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: profile.id, ...body }) });
    setSaving(false);
    if (!response.ok) setNotice("Manual progress could not be saved.");
  };

  const updateSkill = (skill: string, level: number) => {
    const questPoints = /^quest points?$/i.test(skill);
    const xp = questPoints || level === 1 ? 0 : xpForLevel(level);
    setProfile((current) => ({
      ...current,
      skills: [...current.skills.filter((row) => row.skill !== skill), { skill, level, xp }],
      goals: current.goals.map((goal) => {
        if ((goal.kind !== "skill" && goal.kind !== "banked_xp") || goal.skill.toLowerCase() !== skill.toLowerCase()) return goal;
        if (goal.kind === "skill") return { ...goal, currentLevel: level, currentXp: xp, status: xp >= goal.targetXp ? "complete" : "active" };
        return { ...goal, currentLevel: level, currentXp: xp };
      }),
    }));
    void updateManual({ type: "skill", skill, level, xp });
  };

  const updateItem = (itemId: number, name: string, icon: string | undefined, quantity: number) => {
    const outsideBank = profile.items.filter((item) => item.itemId === itemId && item.container !== "bank").reduce((sum, item) => sum + item.quantity, 0);
    const bankQuantity = Math.max(0, quantity - outsideBank);
    setProfile((current) => ({ ...current, items: [...current.items.filter((item) => !(item.itemId === itemId && item.container === "bank")), { itemId, name, icon, quantity: bankQuantity, container: "bank" }] }));
    void updateManual({ type: "item", itemId, quantity: bankQuantity });
  };

  const updateQuest = (quest: string, state: QuestState) => void updateManual({ type: "quest", quest, state });

  const updateVisibility = (visibility: CharacterProfile["visibility"]) => {
    if (visibility === "public" && !profile.lastSyncedAt) {
      setNotice("Connect RuneLite before publishing this profile.");
      return;
    }
    setProfile((current) => ({ ...current, visibility }));
    if (connected) void fetch("/api/app/character", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: profile.id, visibility }) }).then((response) => {
      if (!response.ok) setNotice("Profile visibility could not be saved.");
      else if (visibility === "public") trackEvent("profile_published");
    });
    else if (visibility === "public") trackEvent("profile_published");
  };

  const deleteGoal = async (goal: Goal) => {
    if (!window.confirm(`Delete “${goal.title}”? This cannot be undone.`)) return;
    if (connected) {
      const response = await fetch(`/api/app/goals/${goal.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId: profile.id }) });
      if (!response.ok) return setNotice("The goal could not be deleted.");
    }
    setProfile((current) => ({ ...current, goals: current.goals.filter((item) => item.id !== goal.id) }));
    trackEvent("goal_deleted", { goalKind: goal.kind });
    setSelectedId(profile.goals.find((item) => item.id !== goal.id)?.id ?? "");
  };

  const resetDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setProfile(demoProfile);
    setSelectedId(demoProfile.goals[0].id);
  };

  const switchCharacter = async (character: CharacterSummary) => {
    if (!connected || characterBusy) return;
    if (character.id === profile.id) {
      setCharacterMenuOpen(false);
      return;
    }
    setCharacterBusy(character.id);
    const response = await fetch(`/api/app/characters/${encodeURIComponent(character.id)}`, { method: "PATCH" });
    if (!response.ok) {
      setCharacterBusy("");
      setNotice("That character could not be selected.");
      return;
    }
    setCharacterMenuOpen(false);
    setMobileNav(false);
    trackEvent("character_switched");
    router.push(`/journal?character=${encodeURIComponent(character.slug)}`);
    router.refresh();
  };

  const deleteCharacter = async (character: CharacterSummary) => {
    if (!connected || characterBusy || !window.confirm(`Delete “${character.name}” and all of its goals, synced progress, loot, Collection Log, and RuneLite links? This cannot be undone.`)) return;
    setCharacterBusy(character.id);
    const response = await fetch(`/api/app/characters/${encodeURIComponent(character.id)}`, { method: "DELETE" });
    const body = await response.json().catch(() => ({})) as { nextCharacter?: CharacterSummary | null };
    if (!response.ok) {
      setCharacterBusy("");
      setNotice("That character could not be deleted.");
      return;
    }
    setCharacterList((current) => current.filter((row) => row.id !== character.id));
    if (character.id === profile.id) {
      router.push(body.nextCharacter ? `/journal?character=${encodeURIComponent(body.nextCharacter.slug)}` : "/journal");
      router.refresh();
      return;
    }
    setCharacterBusy("");
    router.refresh();
  };

  const characterCreated = (character: CharacterSummary) => {
    setCharacterCreateOpen(false);
    setCharacterMenuOpen(false);
    setCharacterList((current) => [...current, character]);
    router.push(`/journal?character=${encodeURIComponent(character.slug)}`);
    router.refresh();
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true" />
          <div><strong>IRON PATH</strong><small>field journal</small></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className={`character-switcher ${characterMenuOpen ? "open" : ""}`}>
          <button className="character-card" aria-haspopup="menu" aria-expanded={characterMenuOpen} onClick={() => connected && setCharacterMenuOpen((value) => !value)}>
            <span className="character-sigil">{characterInitials(profile.name)}</span>
            <span><strong>{profile.name}</strong><small>{accountTypeLabel(profile.accountType, profile.lastSyncedAt)} · {profile.totalLevel}</small></span>
            {connected && <ChevronDown size={15} />}
          </button>
          {connected && characterMenuOpen && <div className="character-menu" role="menu">
            <header><span>CHARACTERS</span><small>{characterList.length}/5 journals</small></header>
            <div>{characterList.map((character) => <div className={character.id === profile.id ? "active" : ""} key={character.id}>
              <button role="menuitem" disabled={Boolean(characterBusy)} onClick={() => void switchCharacter(character)}>
                <span className="character-sigil">{characterInitials(character.name)}</span>
                <span><strong>{character.name}</strong><small>{accountTypeLabel(character.accountType, character.lastSyncedAt)} · {character.totalLevel}</small></span>
                {characterBusy === character.id ? <LoaderCircle className="spin" size={14} /> : character.id === profile.id ? <Check size={14} /> : <ChevronRight size={14} />}
              </button>
              <button className="character-delete" disabled={Boolean(characterBusy)} onClick={() => void deleteCharacter(character)} aria-label={`Delete ${character.name}`} title={`Delete ${character.name}`}><Trash2 size={13} /></button>
            </div>)}</div>
            <button className="character-add" disabled={characterList.length >= 5 || Boolean(characterBusy)} onClick={() => setCharacterCreateOpen(true)}><Plus size={14} /><span><strong>Add character</strong><small>{characterList.length >= 5 ? "Five-character limit reached" : `${5 - characterList.length} slot${5 - characterList.length === 1 ? "" : "s"} remaining`}</small></span></button>
          </div>}
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={!showcaseMode ? "active" : ""} onClick={() => setShowcaseMode(false)}><LayoutDashboard size={17} /> Journal</button>
          <button onClick={() => setAddOpen(true)}><Plus size={17} /> New goal</button>
          <button className={showcaseMode ? "active" : ""} onClick={() => { if (!showcaseMode) trackEvent("showcase_opened"); setShowcaseMode(true); }}><Trophy size={17} /> Showcase</button>
        </nav>

        <div className="side-heading"><span>ACTIVE GOALS</span><span>{profile.goals.filter((goal) => goal.status !== "complete").length}</span></div>
        <div className="goal-nav-list">
          {profile.goals.filter((goal) => goal.status !== "complete").map((goal) => {
            const meta = goalMeta(goal, profile);
            return (
              <button key={goal.id} className={selectedId === goal.id && !showcaseMode ? "active" : ""} onClick={() => { setSelectedId(goal.id); setShowcaseMode(false); setMobileNav(false); }}>
                <span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span>
                <span className="goal-nav-copy"><strong>{goal.title}</strong><small>{meta.label}</small><i><b style={{ width: `${meta.percent}%` }} /></i></span>
                <ChevronRight size={14} />
              </button>
            );
          })}
        </div>
        {profile.goals.some((goal) => goal.status === "complete") && <>
          <div className="side-heading side-heading--completed"><span>COMPLETED</span><span>{profile.goals.filter((goal) => goal.status === "complete").length}</span></div>
          <div className="goal-nav-list goal-nav-list--completed">
            {profile.goals.filter((goal) => goal.status === "complete").map((goal) => (
              <button key={goal.id} className={selectedId === goal.id && !showcaseMode ? "active complete" : "complete"} onClick={() => { setSelectedId(goal.id); setShowcaseMode(false); setMobileNav(false); }}>
                <span className={`goal-kind goal-kind--${goal.kind}`}><Check size={15} /></span>
                <span className="goal-nav-copy"><strong>{goal.title}</strong><small>Complete</small><i><b style={{ width: "100%" }} /></i></span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </>}

        <div className="sidebar-footer">
          {showAnalytics && <a href="/analytics"><BarChart3 size={16} /> Analytics</a>}
          <button onClick={() => { setConnectOpen(true); trackEvent("plugin_link_started"); }}><span className={profile.lastSyncedAt ? "connection-dot" : "connection-dot connection-dot--idle"} /> {profile.lastSyncedAt ? "RuneLite connected" : "Connect RuneLite"}</button>
          <button onClick={() => setSettingsOpen(true)}><Settings size={16} /> Account</button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="crumbs"><span>{profile.name}</span><ChevronRight size={13} /><strong>{showcaseMode ? "Showcase" : selected?.title ?? "Journal"}</strong></div>
          <div className="topbar-actions">
            <span className="sync-note">{saving ? <LoaderCircle className="spin" size={13} /> : <RefreshCw size={13} />} {saving ? "Saving…" : `Synced ${timeAgo(profile.lastSyncedAt)}`}</span>
            <button className="ghost-button" onClick={() => { setConnectOpen(true); trackEvent("plugin_link_started"); }}><Link2 size={15} /> Plugin</button>
            <button className="avatar-button" onClick={() => setSettingsOpen(true)} aria-label="Account menu"><UserRound size={17} /></button>
          </div>
        </header>

        <div className="workspace">
          {showcaseMode ? (
            <Showcase profile={profile} onVisibility={updateVisibility} onGoalPublic={(goal) => updateGoal(goal.id, () => ({ ...goal, public: !goal.public }))} onSkill={updateSkillShowcase} onRecentCollections={updateRecentCollectionsShowcase} onCollection={updateCollectionSelection} />
          ) : (
            <>
              <section className="goal-column">
                <div className="column-toolbar">
                  <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter your goals" /></label>
                  <button className="square-button" onClick={() => setAddOpen(true)} aria-label="Add goal"><Plus size={17} /></button>
                </div>
                {recommendations.length > 0 && <RecommendationPanel recommendations={recommendations} onFollow={(recommendation) => void followRecommendation(recommendation)} />}
                {profile.recentCollections.length > 0 && <RecentCollections items={profile.recentCollections} />}
                <div className="goal-card-list">
                  {activeGoals.map((goal, index) => <GoalCard key={goal.id} goal={goal} profile={profile} active={goal.id === selectedId} index={index} onSelect={() => setSelectedId(goal.id)} />)}
                  {!matchingGoals.length && <div className="empty-journal"><BookOpen size={25} /><strong>{profile.goals.length ? "No paths match" : "Your journal is empty"}</strong><small>{profile.goals.length ? "Try another search." : "Add a quest, item grind, or level grind."}</small></div>}
                  {!activeGoals.length && completedGoals.length > 0 && !query && <div className="empty-journal empty-journal--compact"><Check size={22} /><strong>All paths complete</strong><small>Add a new goal when you are ready.</small></div>}
                </div>
                <button className="add-goal-card" onClick={() => setAddOpen(true)}><Plus size={19} /><span><strong>Mark a new path</strong><small>Quest, item grind, or level grind</small></span></button>
                {completedGoals.length > 0 && <>
                  <div className="journal-section-heading"><span>COMPLETED</span><span>{completedGoals.length}</span></div>
                  <div className="goal-card-list goal-card-list--completed">
                    {completedGoals.map((goal, index) => <GoalCard key={goal.id} goal={goal} profile={profile} active={goal.id === selectedId} index={index} onSelect={() => setSelectedId(goal.id)} />)}
                  </div>
                </>}
              </section>

              <section className="detail-column">
                {selected?.kind === "quest" && <QuestDetail goal={selected} profile={profile} onUpdate={(goal) => updateGoal(goal.id, () => goal)} onStatus={() => void updateGoalStatus(selected.id, selected.status === "complete" ? "active" : "complete")} onSkill={updateSkill} onCreateSkill={(skill, target) => void createSkillGoal(selected, skill, target)} onItem={updateItem} onQuest={updateQuest} onDelete={() => void deleteGoal(selected)} />}
                {selected?.kind === "grind" && <GrindDetail goal={selected} onUpdate={(goal) => updateGoal(goal.id, () => goal)} onStatus={() => void updateGoalStatus(selected.id, selected.status === "complete" ? "active" : "complete")} onDelete={() => void deleteGoal(selected)} />}
                {selected?.kind === "banked_xp" && <XpDetail goal={selected} profile={profile} onUpdate={(goal) => updateGoal(goal.id, () => goal)} onStatus={() => void updateGoalStatus(selected.id, selected.status === "complete" ? "active" : "complete")} onDelete={() => void deleteGoal(selected)} />}
                {selected?.kind === "skill" && <SkillDetail goal={selected} profile={profile} onUpdate={(goal) => updateGoal(goal.id, () => goal)} onDelete={() => void deleteGoal(selected)} />}
                {!selected && <div className="empty-detail"><Target size={31} /><h1>Choose your next path.</h1><p>The Wiki catalog is ready when you are.</p><button onClick={() => setAddOpen(true)}><Plus size={15} /> Add first goal</button></div>}
              </section>
            </>
          )}
        </div>
      </main>

      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {notice && <button className="save-notice" onClick={() => setNotice("")}>{notice}<X size={14} /></button>}
      {addOpen && <AddGoalDialog onClose={() => setAddOpen(false)} onAdd={addGoal} profile={profile} connected={connected} />}
      {connectOpen && <ConnectDialog onClose={() => setConnectOpen(false)} onReset={resetDemo} characterId={profile.id} connected={connected} />}
      {characterCreateOpen && <CharacterDialog onClose={() => setCharacterCreateOpen(false)} onCreated={characterCreated} />}
      {settingsOpen && <AccountDialog onClose={() => setSettingsOpen(false)} connected={connected} />}
    </div>
  );
}

function RecentCollections({ items }: { items: CharacterProfile["recentCollections"] }) {
  return <section className="recent-collections">
    <header><span>RECENT COLLECTIONS LOGGED</span><small>{items.length}</small></header>
    <div>{items.slice(0, 10).map((item) => <article key={item.itemId} title={item.name}>
      <ItemImage src={item.icon} alt={item.name} size={38} />
      <strong>{item.name}</strong>
      <small>{item.firstSeenAt ? timeAgo(item.firstSeenAt) : "Latest log"}</small>
    </article>)}</div>
  </section>;
}

function GoalCard({ goal, profile, active, index, onSelect }: { goal: Goal; profile: CharacterProfile; active: boolean; index: number; onSelect: () => void }) {
  const meta = goalMeta(goal, profile);
  return (
    <button className={`goal-card ${active ? "goal-card--active" : ""} ${goal.status === "complete" ? "goal-card--complete" : ""}`} style={{ animationDelay: `${index * 70}ms` }} onClick={onSelect}>
      <span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span>
      <span className="goal-card-main">
        <span className="goal-card-top"><em>{goal.status === "complete" ? "COMPLETED" : goal.kind === "banked_xp" ? "BANKED XP" : goal.kind === "skill" ? "LEVEL GRIND" : goal.kind.toUpperCase()}</em>{goal.status === "complete" ? <Check size={13} /> : goal.public ? <Eye size={13} /> : <LockKeyhole size={12} />}</span>
        <strong>{goal.title}</strong>
        <span className="progress-track"><i style={{ width: `${meta.percent}%` }} /></span>
        <small>{meta.label}<b>{meta.percent}%</b></small>
      </span>
    </button>
  );
}

function RecommendationPanel({ recommendations, onFollow }: { recommendations: QuestRecommendation[]; onFollow: (recommendation: QuestRecommendation) => void }) {
  return <section className="recommendation-panel">
    <header><span><Sparkles size={14} /> NEXT STEPS</span><small>Level grinds from active quest blockers</small></header>
    <div>{recommendations.map((recommendation) => <button key={recommendation.id} onClick={() => onFollow(recommendation)}>
      <span className={`goal-kind goal-kind--${recommendation.kind === "skill" ? "skill" : recommendation.kind === "quest" ? "quest" : "grind"}`}>{recommendation.kind === "quest" ? <BookOpen size={13} /> : recommendation.kind === "item" ? <Gem size={13} /> : <Zap size={13} />}</span>
      <span><strong>{recommendation.title}</strong><small>{recommendation.detail}</small></span>
      <em>{recommendation.existingGoalId ? "VIEW" : recommendation.kind === "item" ? "SOURCES" : "ADD"}</em>
    </button>)}</div>
  </section>;
}

function DetailHeader({ eyebrow, title, subtitle, collapsibleDescription = false, icon, publicValue, status, derivedStatus = false, onPublic, onStatus, onDelete }: { eyebrow: string; title: string; subtitle: string; collapsibleDescription?: boolean; icon: React.ReactNode; publicValue: boolean; status?: Goal["status"]; derivedStatus?: boolean; onPublic: () => void; onStatus: () => void; onDelete: () => void }) {
  return (
    <header className="detail-header">
      <span className="detail-medallion">{icon}</span>
      <div>
        <small>{eyebrow}</small>
        <h1>{title}</h1>
        {collapsibleDescription ? (
          <details className="detail-description" key={title}>
            <summary>Quest description <ChevronDown size={12} /></summary>
            <p>{subtitle}</p>
          </details>
        ) : <p>{subtitle}</p>}
      </div>
      <div className="detail-actions">
        {derivedStatus ? <span className={`goal-status-button ${status === "complete" ? "complete" : ""}`}>{status === "complete" ? <Check size={13} /> : <RefreshCw size={13} />}{status === "complete" ? "Target reached" : "Synced progress"}</span> : <button className={`goal-status-button ${status === "complete" ? "complete" : ""}`} onClick={onStatus}>{status === "complete" ? <RefreshCw size={13} /> : <Check size={13} />}{status === "complete" ? "Reopen goal" : "Mark complete"}</button>}
        <button className="icon-button" onClick={onDelete} aria-label={`Delete ${title}`} title="Delete goal"><Trash2 size={16} /></button>
      </div>
      <button className={`visibility-pill ${publicValue ? "public" : ""}`} onClick={onPublic}>{publicValue ? <Eye size={13} /> : <EyeOff size={13} />}{publicValue ? "Showcased" : "Private"}</button>
    </header>
  );
}

function QuestDetail({ goal, profile, onUpdate, onStatus, onSkill, onCreateSkill, onItem, onQuest, onDelete }: { goal: QuestGoal; profile: CharacterProfile; onUpdate: (goal: QuestGoal) => void; onStatus: () => void; onSkill: (skill: string, level: number) => void; onCreateSkill: (skill: string, targetLevel: number) => void; onItem: (itemId: number, name: string, icon: string | undefined, quantity: number) => void; onQuest: (quest: string, state: QuestState) => void; onDelete: () => void }) {
  const skills = Object.fromEntries(profile.skills.map((skill) => [skill.skill, skill.level]));
  const readiness = questReadiness(goal, profile.items, skills);
  return (
    <div className="detail-page">
      <DetailHeader eyebrow="QUEST PATH" title={goal.title} subtitle={goal.description} collapsibleDescription icon={<BookOpen size={27} />} publicValue={goal.public} status={goal.status} onPublic={() => onUpdate({ ...goal, public: !goal.public })} onStatus={onStatus} onDelete={onDelete} />
      <div className="readiness-strip">
        <div className="readiness-ring" style={{ "--progress": `${readiness.percent * 3.6}deg` } as React.CSSProperties}><span>{readiness.percent}<small>%</small></span></div>
        <div><small>READINESS</small><strong>{readiness.ready} of {readiness.total} requirements met</strong><p>RuneLite will complete this path when your quest state changes.</p></div>
        <div className="quest-actions"><a href={goal.wikiUrl} target="_blank" rel="noreferrer">Wiki guide <ExternalLink size={13} /></a><button onClick={() => { const state = goal.state === "not_started" ? "in_progress" : goal.state === "in_progress" ? "finished" : "not_started"; onUpdate({ ...goal, state }); onQuest(goal.title, state); }}>{goal.state.replace("_", " ")}</button></div>
      </div>

      <Section title="Skill requirements" count={`${goal.requirements.filter((item) => (skills[item.skill] ?? 1) >= item.level).length}/${goal.requirements.length}`}>
        <div className="skill-grid">
          {goal.requirements.map((requirement) => {
            const current = skills[requirement.skill] ?? 1;
            const ready = current >= requirement.level;
            const maxLevel = /^quest points?$/i.test(requirement.skill) ? 999 : 99;
            return (
              <div className={ready ? "ready" : "missing"} key={requirement.skill}>
                <ItemImage src={skillIcon(requirement.skill)} alt={requirement.skill} size={31} />
                <span><small>{requirement.skill}</small><strong><input aria-label={`Current ${requirement.skill}`} type="number" min={1} max={maxLevel} value={current} onChange={(event) => onSkill(requirement.skill, Math.min(maxLevel, Math.max(1, Number(event.target.value))))} /><i>/ {requirement.level}</i></strong></span>
                {!ready && !/^quest points?$/i.test(requirement.skill) && <button className="create-skill-goal" onClick={() => onCreateSkill(requirement.skill, requirement.level)}><Target size={11} /> Track</button>}
                <span className="manual-stepper"><button aria-label={`Lower ${requirement.skill}`} onClick={() => onSkill(requirement.skill, Math.max(1, current - 1))}><Minus size={11} /></button><button aria-label={`Raise ${requirement.skill}`} onClick={() => onSkill(requirement.skill, Math.min(maxLevel, current + 1))}><Plus size={11} /></button></span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Required items" count={`${goal.items.filter((item) => item.manual ? item.complete : ownedQuantity(profile.items, item.itemId) >= item.quantity).length}/${goal.items.length}`}>
        <div className="item-requirement-list">
          {goal.items.map((item) => {
            const owned = ownedQuantity(profile.items, item.itemId);
            const ready = item.manual ? item.complete : owned >= item.quantity;
            return (
              <div key={item.id} className={`item-requirement ${ready ? "ready" : "missing"}`}>
                <ItemImage src={item.icon} alt={item.name} size={37} />
                <span><strong>{item.name}</strong><small>{item.note ?? (item.manual ? "Manual check" : `${fullNumber(owned)} in containers`)}</small></span>
                {item.manual ? <button aria-label={`Toggle ${item.name}`} className={`manual-check ${ready ? "checked" : ""}`} onClick={() => onUpdate({ ...goal, items: goal.items.map((row) => row.id === item.id ? { ...row, complete: !row.complete } : row) })}>{ready && <Check size={13} />}</button> : <span className="item-quantity-controls"><button aria-label={`Remove one ${item.name}`} onClick={() => onItem(item.itemId!, item.name, item.icon, Math.max(0, owned - 1))}><Minus size={11} /></button><span className="quantity-readout"><strong>{fullNumber(owned)}</strong><small>/ {item.quantity}</small></span><button aria-label={`Add one ${item.name}`} onClick={() => onItem(item.itemId!, item.name, item.icon, owned + 1)}><Plus size={11} /></button></span>}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Quest line" count={`${goal.prerequisites.filter((quest) => quest.state === "finished").length}/${goal.prerequisites.length}`}>
        <div className="quest-chain">
          {goal.prerequisites.map((quest, index) => {
            const finished = quest.state === "finished";
            return <button className={finished ? "complete" : ""} key={quest.name} onClick={() => { const state = finished ? "not_started" : "finished"; onUpdate({ ...goal, prerequisites: goal.prerequisites.map((row) => row.name === quest.name ? { ...row, state } : row) }); onQuest(quest.name, state); }}><span>{index + 1}</span><strong>{quest.name}</strong><small>{finished ? <><Check size={12} /> Complete</> : "Mark complete"}</small></button>;
          })}
        </div>
      </Section>
    </div>
  );
}

function GrindDetail({ goal, onUpdate, onStatus, onDelete }: { goal: GrindGoal; onUpdate: (goal: GrindGoal) => void; onStatus: () => void; onDelete: () => void }) {
  const progress = grindProgress(goal);
  return (
    <div className="detail-page">
      <DetailHeader eyebrow={`ITEM GRIND · ${goal.monster.toUpperCase()}`} title={goal.title} subtitle={`Hunting ${goal.targetItemName} at a 1/${fullNumber(goal.dropRate)} drop rate.`} icon={<ItemImage src={goal.targetIcon} alt={goal.targetItemName} size={54} />} publicValue={goal.public} status={goal.status} onPublic={() => onUpdate({ ...goal, public: !goal.public })} onStatus={onStatus} onDelete={onDelete} />
      <div className="grind-hero">
        <div className="kc-block"><small>TOTAL KILL COUNT</small><strong>{fullNumber(progress.kc)}</strong><span>{goal.startingKc} baseline + {goal.observedKc} synced</span></div>
        <div className="rate-orbit"><span><strong>{progress.rateProgress}%</strong><small>OF DROP RATE</small></span></div>
        <div className="odds-block"><small>CHANCE SEEN BY NOW</small><strong>{progress.probability.toFixed(1)}%</strong><span>{progress.obtained ? `${progress.obtained} obtained` : "Still hunting"}</span></div>
      </div>

      <Section title="Grind settings" count="LIVE">
        <div className="settings-row">
          <label><span>Starting KC</span><input type="number" value={goal.startingKc} min={0} onChange={(event) => onUpdate({ ...goal, startingKc: Math.max(0, Number(event.target.value)) })} /></label>
          <label><span>RuneLite KC</span><input value={goal.observedKc} disabled /></label>
          <label><span>Drop rate</span><input value={`1 / ${fullNumber(goal.dropRate)}`} disabled /></label>
        </div>
      </Section>

      <Section title="Notable drops" count={`${goal.drops.filter((drop) => drop.public).length} shown`}>
        <div className="drop-grid">
          {goal.drops.map((drop) => (
            <div key={drop.itemId} className={`drop-card ${drop.public ? "public" : ""}`}>
              <span className="drop-spark" />
              <ItemImage src={drop.icon} alt={drop.name} size={52} />
              <strong>{drop.quantity}<small>×</small></strong>
              <span><b>{drop.name}</b><small>{drop.rarity} · {drop.source}</small></span>
              <span className="drop-actions"><button aria-label={`Remove one ${drop.name}`} onClick={() => onUpdate({ ...goal, drops: goal.drops.map((item) => item.itemId === drop.itemId ? { ...item, quantity: Math.max(0, item.quantity - 1), source: "manual" } : item) })}><Minus size={11} /></button><button aria-label={`Add one ${drop.name}`} onClick={() => onUpdate({ ...goal, drops: goal.drops.map((item) => item.itemId === drop.itemId ? { ...item, quantity: item.quantity + 1, source: "manual" } : item) })}><Plus size={11} /></button><button aria-label={`Toggle ${drop.name} visibility`} onClick={() => onUpdate({ ...goal, drops: goal.drops.map((item) => item.itemId === drop.itemId ? { ...item, public: !item.public } : item) })}>{drop.public ? <Eye size={12} /> : <EyeOff size={12} />}</button></span>
            </div>
          ))}
        </div>
      </Section>

      <div className="event-note"><Sparkles size={17} /><span><strong>Observed loot is append-only.</strong> Replayed events are ignored by event ID, so reconnecting the plugin will not inflate KC.</span></div>
    </div>
  );
}

function XpDetail({ goal, profile, onUpdate, onStatus, onDelete }: { goal: BankedXpGoal; profile: CharacterProfile; onUpdate: (goal: BankedXpGoal) => void; onStatus: () => void; onDelete: () => void }) {
  const catalogMethods = bankedMethodsForSkill(goal.skill);
  const selectedMethodIds = goal.selectedMethodIds ?? goal.activities.map((activity) => activity.id);
  const accurate = catalogMethods.length > 0;
  const plan = accurate ? calculateBankedPlan(goal.skill, goal.currentLevel, goal.currentXp, goal.targetLevel, {
    selectedMethodIds, includeOutputs: goal.includeOutputs, respectLevels: goal.respectLevels, showSecondaries: goal.showSecondaries,
  }, profile.items, profile.accountType) : null;
  const summary = plan ?? bankedXp(goal);
  const toggleMethod = (methodId: string) => {
    const method = catalogMethods.find((row) => row.id === methodId)!;
    const active = selectedMethodIds.includes(methodId);
    const next = active ? selectedMethodIds.filter((id) => id !== methodId) : [
      ...selectedMethodIds.filter((id) => catalogMethods.find((row) => row.id === id)?.family !== method.family), methodId,
    ];
    onUpdate({ ...goal, selectedMethodIds: next });
  };
  return (
    <div className="detail-page">
      <DetailHeader eyebrow="BANKED EXPERIENCE" title={goal.title} subtitle={`Turn your bank into a clear path from ${goal.currentLevel} to ${goal.targetLevel} ${goal.skill}.`} icon={<ItemImage src={skillIcon(goal.skill)} alt={goal.skill} size={48} />} publicValue={goal.public} status={goal.status} onPublic={() => onUpdate({ ...goal, public: !goal.public })} onStatus={onStatus} onDelete={onDelete} />
      <div className="xp-ledger">
        <div><small>CURRENT XP</small><strong>{fullNumber(goal.currentXp)}</strong><span>Level {goal.currentLevel}</span></div>
        <ChevronRight size={21} />
        <div className="accent"><small>BANKED XP</small><strong>+{fullNumber(summary.banked)}</strong><span>{accurate ? selectedMethodIds.length : goal.activities.length} selected methods</span></div>
        <ChevronRight size={21} />
        <div><small>PROJECTED</small><strong>Level {summary.projectedLevel}</strong><span>{fullNumber(summary.remaining)} xp short</span></div>
      </div>
      <div className="xp-progress"><span><i style={{ width: `${summary.percent}%` }} /></span><small>{summary.percent}% of the remaining path banked</small></div>

      <Section title="Level settings" count="MANUAL">
        <div className="settings-row">
          <label><span>Current level</span><input type="number" min={1} max={99} value={goal.currentLevel} onChange={(event) => onUpdate({ ...goal, currentLevel: Math.min(99, Math.max(1, Number(event.target.value))) })} /></label>
          <label><span>Current XP</span><input type="number" min={0} value={goal.currentXp} onChange={(event) => onUpdate({ ...goal, currentXp: Math.max(0, Number(event.target.value)) })} /></label>
          <label><span>Target level</span><input type="number" min={2} max={99} value={goal.targetLevel} onChange={(event) => onUpdate({ ...goal, targetLevel: Math.min(99, Math.max(2, Number(event.target.value))) })} /></label>
        </div>
      </Section>

      <Section title="Banked activities" count={`${accurate ? catalogMethods.length : goal.activities.length} methods`}>
        <div className="activity-list">
          {accurate ? catalogMethods.map((method) => {
            const methodResult = plan?.methods.find((row) => row.id === method.id);
            const legacy = methodsForSkill(method.skill).find((row) => row.id === method.id);
            const active = selectedMethodIds.includes(method.id);
            return <button className={`xp-method-row ${active ? "active" : ""}`} key={method.id} onClick={() => toggleMethod(method.id)}>
              <ItemImage src={legacy?.inputIcon} alt={method.inputs[0].name} size={44} />
              <span><strong>{method.label}</strong><small>Level {method.requiredLevel} · {method.xpEach} xp each</small></span>
              <span className="activity-qty"><small>ACTIONS</small><strong>{active ? fullNumber(methodResult?.actions ?? 0) : "—"}</strong></span>
              <span className="activity-xp"><small>BANKED</small><strong>{active ? `${compactNumber(methodResult?.xp ?? 0)} xp` : "Not selected"}</strong></span>
              {active && methodResult?.locked && <em>Requires level {method.requiredLevel}</em>}
              {active && !methodResult?.locked && methodResult?.missing[0] && <em>Limited by {methodResult.missing[0].name}</em>}
            </button>;
          }) : goal.activities.map((activity) => (
            <div key={activity.id}>
              <ItemImage src={activity.inputIcon} alt={activity.inputName} size={44} />
              <span><strong>{activity.inputName}</strong><small>{activity.label} · {activity.xpEach} xp each</small></span>
              <label className="activity-qty"><small>IN BANK</small><input type="number" min={0} value={activity.quantity} onChange={(event) => onUpdate({ ...goal, activities: goal.activities.map((row) => row.id === activity.id ? { ...row, quantity: Math.max(0, Number(event.target.value)) } : row) })} /></label>
              <span className="activity-xp"><small>BANKED</small><strong>{compactNumber(activity.quantity * activity.xpEach)} xp</strong></span>
              {goal.showSecondaries && activity.secondary && <em>{fullNumber(activity.secondaryQuantity ?? activity.quantity)} × {activity.secondary}</em>}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Calculation rules" count="3">
        <div className="toggle-list">
          <Toggle label="Include intermediate outputs" detail="Count outputs that feed another selected activity." value={goal.includeOutputs} onChange={() => onUpdate({ ...goal, includeOutputs: !goal.includeOutputs })} />
          <Toggle label="Respect current level" detail="Exclude methods above your synced real level." value={goal.respectLevels} onChange={() => onUpdate({ ...goal, respectLevels: !goal.respectLevels })} />
          <Toggle label="Show required secondaries" detail="Flag supplies without capping the optimistic XP total." value={goal.showSecondaries} onChange={() => onUpdate({ ...goal, showSecondaries: !goal.showSecondaries })} />
        </div>
      </Section>
    </div>
  );
}

function SkillDetail({ goal, profile, onUpdate, onDelete }: { goal: SkillGoal; profile: CharacterProfile; onUpdate: (goal: SkillGoal) => void; onDelete: () => void }) {
  const progress = skillProgress(goal);
  const plan = goal.bankedPlan ? calculateBankedPlan(goal.skill, goal.currentLevel, goal.currentXp, goal.targetLevel, goal.bankedPlan, profile.items, profile.accountType) : null;
  const methods = bankedMethodsForSkill(goal.skill);
  const canAddBankedXp = methods.length > 0;
  const toggleMethod = (methodId: string) => {
    if (!goal.bankedPlan) return;
    const method = methods.find((row) => row.id === methodId)!;
    const active = goal.bankedPlan.selectedMethodIds.includes(methodId);
    const selectedMethodIds = active ? goal.bankedPlan.selectedMethodIds.filter((id) => id !== methodId) : [
      ...goal.bankedPlan.selectedMethodIds.filter((id) => methods.find((row) => row.id === id)?.family !== method.family), methodId,
    ];
    onUpdate({ ...goal, bankedPlan: { ...goal.bankedPlan, selectedMethodIds } });
  };
  const toggleBankedXp = () => onUpdate({
    ...goal,
    bankedPlan: goal.bankedPlan ? undefined : {
      selectedMethodIds: defaultMethodIds(goal.skill, goal.currentLevel),
      includeOutputs: true,
      respectLevels: true,
      showSecondaries: true,
    },
  });
  return <div className="detail-page">
    <DetailHeader eyebrow="LEVEL GRIND" title={goal.title} subtitle={`${fullNumber(progress.remaining)} XP remains before ${goal.sourceGoals.map((source) => source.title).join(", ") || "your target"}.`} icon={<ItemImage src={skillIcon(goal.skill)} alt={goal.skill} size={48} />} publicValue={goal.public} status={goal.status} derivedStatus onPublic={() => onUpdate({ ...goal, public: !goal.public })} onStatus={() => undefined} onDelete={onDelete} />
    <div className="xp-ledger">
      <div><small>CURRENT</small><strong>Level {goal.currentLevel}</strong><span>{fullNumber(goal.currentXp)} XP</span></div><ChevronRight size={21} />
      <div className="accent"><small>TARGET</small><strong>Level {goal.targetLevel}</strong><span>{fullNumber(goal.targetXp)} XP</span></div><ChevronRight size={21} />
      <div><small>{plan ? "AFTER BANK" : "REMAINING"}</small><strong>{plan ? `Level ${plan.projectedLevel}` : `${fullNumber(progress.remaining)} XP`}</strong><span>{plan ? `${fullNumber(plan.remaining)} XP short` : "to reach your target"}</span></div>
    </div>
    <div className="xp-progress"><span><i style={{ width: `${progress.percent}%` }} /></span><small>{progress.percent}% of target XP reached</small></div>
    <Section title="Target settings" count="SYNCED">
      <div className="settings-row skill-target-settings">
        <label><span>Current level</span><input value={goal.currentLevel} disabled /></label>
        <label><span>Current XP</span><input value={fullNumber(goal.currentXp)} disabled /></label>
        <label><span>Target level</span><input type="number" min={2} max={99} value={goal.targetLevel} onChange={(event) => {
          const targetLevel = Math.min(99, Math.max(2, Number(event.target.value)));
          const targetXp = xpForLevel(targetLevel);
          onUpdate({ ...goal, targetLevel, targetXp, status: goal.currentXp >= targetXp ? "complete" : "active" });
        }} /></label>
      </div>
    </Section>
    {goal.sourceGoals.length > 0 && <Section title="Quest links" count={`${goal.sourceGoals.length}`}><div className="source-goal-list">{goal.sourceGoals.map((source) => <span key={source.goalId}><BookOpen size={13} /><strong>{source.title}</strong><small>Needs {source.requiredLevel} {goal.skill}</small></span>)}</div></Section>}
    <Section title="Banked XP" count={goal.bankedPlan ? "BETA · ON" : "BETA"}>
      <div className="beta-feature">
        <span><strong>Banked XP is in beta</strong><small>{canAddBankedXp ? "Optionally estimate how far your current bank can take this level grind. Methods and supply coverage are still being expanded." : `Banked XP support is not available for ${goal.skill} yet.`}</small></span>
        <button disabled={!canAddBankedXp} onClick={toggleBankedXp}>{goal.bankedPlan ? "Remove banked XP" : "Add banked XP"}</button>
      </div>
    </Section>
    {goal.bankedPlan && <>
      <Section title="Banked plan" count={`${goal.bankedPlan.selectedMethodIds.length} selected`}><div className="activity-list">{methods.map((method) => {
        const active = goal.bankedPlan!.selectedMethodIds.includes(method.id);
        const result = plan?.methods.find((row) => row.id === method.id);
        const legacy = methodsForSkill(method.skill).find((row) => row.id === method.id);
        return <button className={`xp-method-row ${active ? "active" : ""}`} key={method.id} onClick={() => toggleMethod(method.id)}><ItemImage src={legacy?.inputIcon} alt={method.inputs[0].name} size={44} /><span><strong>{method.label}</strong><small>Level {method.requiredLevel} · {method.xpEach} xp</small></span><span className="activity-qty"><small>ACTIONS</small><strong>{active ? fullNumber(result?.actions ?? 0) : "—"}</strong></span><span className="activity-xp"><small>BANKED</small><strong>{active ? `${compactNumber(result?.xp ?? 0)} xp` : "Not selected"}</strong></span>{active && result?.missing[0] && <em>Limited by {result.missing[0].name}</em>}</button>;
      })}</div></Section>
      <Section title="Calculation rules" count="3"><div className="toggle-list"><Toggle label="Include intermediate outputs" detail="Feed created resources into later methods." value={goal.bankedPlan.includeOutputs} onChange={() => onUpdate({ ...goal, bankedPlan: { ...goal.bankedPlan!, includeOutputs: !goal.bankedPlan!.includeOutputs } })} /><Toggle label="Respect current level" detail="Exclude methods above your synced level." value={goal.bankedPlan.respectLevels} onChange={() => onUpdate({ ...goal, bankedPlan: { ...goal.bankedPlan!, respectLevels: !goal.bankedPlan!.respectLevels } })} /><Toggle label="Show secondaries" detail="Expose the supplies limiting each method." value={goal.bankedPlan.showSecondaries} onChange={() => onUpdate({ ...goal, bankedPlan: { ...goal.bankedPlan!, showSecondaries: !goal.bankedPlan!.showSecondaries } })} /></div></Section>
    </>}
  </div>;
}

function Section({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return <section className="detail-section"><header><h2>{title}</h2><span>{count}</span></header>{children}</section>;
}

function Toggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: () => void }) {
  return <button onClick={onChange}><span><strong>{label}</strong><small>{detail}</small></span><i className={value ? "on" : ""}><b /></i></button>;
}

function AddGoalDialog({ onClose, onAdd, profile, connected }: { onClose: () => void; onAdd: (goal: Goal) => Promise<void>; profile: CharacterProfile; connected: boolean }) {
  const syncedSkills = sortedSkills(profile.skills).filter((row) => !/^overall|quest points?$/i.test(row.skill));
  const trainableSkills = syncedSkills.filter((row) => row.level < 99);
  const levelSkills = trainableSkills.length ? trainableSkills : syncedSkills;
  const initialSkill = levelSkills[0] ?? { skill: "Attack", level: 1, xp: 0 };
  const [kind, setKind] = useState<"quest" | "grind" | "skill">("quest");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Goal[]>(connected ? [] : quickAddGoals);
  const [grindSearchBy, setGrindSearchBy] = useState<"item" | "monster">("item");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState("");
  const [skill, setSkill] = useState(initialSkill.skill);
  const [targetLevel, setTargetLevel] = useState(Math.min(99, initialSkill.level + 1));
  const [includeBankedXp, setIncludeBankedXp] = useState(false);
  const currentSkill = profile.skills.find((row) => row.skill.toLowerCase() === skill.toLowerCase());
  const bankedMethods = bankedMethodsForSkill(skill);

  useEffect(() => {
    if (!connected || kind === "skill" || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/app/catalog?kind=${kind}&searchBy=${grindSearchBy}&q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const body = await response.json().catch(() => ({ results: [] }));
        if (!controller.signal.aborted) setResults(response.ok ? body.results ?? [] : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [connected, grindSearchBy, kind, query]);

  const displayedResults = connected ? (query.trim().length >= 2 ? results : []) : quickAddGoals.filter((goal) => goal.kind === kind);

  const add = async (goal: Goal) => {
    setAdding(goal.id);
    await onAdd(goal);
    setAdding("");
  };

  const addLevelGoal = async () => {
    const currentLevel = currentSkill?.level ?? 1;
    const currentXp = currentSkill?.xp ?? 0;
    const targetXp = xpForLevel(targetLevel);
    await add({
      id: `level-${skill.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${targetLevel}-${Date.now()}`,
      kind: "skill",
      title: `Train ${targetLevel} ${skill}`,
      skill,
      targetLevel,
      targetXp,
      currentLevel,
      currentXp,
      sourceGoals: [],
      bankedPlan: includeBankedXp && bankedMethods.length ? {
        selectedMethodIds: defaultMethodIds(skill, currentLevel),
        includeOutputs: true,
        respectLevels: true,
        showSecondaries: true,
      } : undefined,
      public: false,
      status: currentXp >= targetXp ? "complete" : "active",
    });
  };

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-panel">
        <header><div><small>ADD TO YOUR JOURNAL</small><h2 id="add-title">Choose the next path</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
        <div className="goal-type-tabs"><button className={kind === "quest" ? "active" : ""} onClick={() => setKind("quest")}><BookOpen size={14} /> Quest</button><button className={kind === "grind" ? "active" : ""} onClick={() => setKind("grind")}><Target size={14} /> Item grind</button><button className={kind === "skill" ? "active" : ""} onClick={() => setKind("skill")}><Zap size={14} /> Level grind</button></div>
        {kind === "grind" && <div className="grind-search-mode"><span>CHOOSE YOUR ROUTE</span><div><button className={grindSearchBy === "item" ? "active" : ""} onClick={() => { setGrindSearchBy("item"); setQuery(""); }}><span className="goal-kind goal-kind--grind"><Gem size={14} /></span><span><strong>Start with an item</strong><small>Then choose its monster source</small></span></button><button className={grindSearchBy === "monster" ? "active" : ""} onClick={() => { setGrindSearchBy("monster"); setQuery(""); }}><span className="goal-kind goal-kind--grind"><Target size={14} /></span><span><strong>Start with a monster</strong><small>Then choose its target drop</small></span></button></div></div>}
        {kind !== "skill" && <label className="modal-search"><Search size={16} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={kind === "quest" ? "Search 217 Wiki quests" : grindSearchBy === "item" ? "Search a target item, e.g. dragon warhammer" : "Search a monster, e.g. Tormented Demon"} />{loading && <LoaderCircle className="spin" size={15} />}</label>}
        {kind === "skill" ? (
          <div className="xp-goal-builder">
            <label><span>Skill</span><select value={skill} onChange={(event) => { const next = levelSkills.find((row) => row.skill === event.target.value); setSkill(event.target.value); setTargetLevel(Math.min(99, (next?.level ?? 1) + 1)); setIncludeBankedXp(false); }}>{levelSkills.map((value) => <option key={value.skill} value={value.skill}>{value.skill} · Level {value.level}</option>)}</select></label>
            <label><span>Target level</span><input type="number" min={Math.min(99, (currentSkill?.level ?? 1) + 1)} max={99} value={targetLevel} onChange={(event) => setTargetLevel(Math.min(99, Math.max(Math.min(99, (currentSkill?.level ?? 1) + 1), Number(event.target.value))))} /></label>
            <div className="beta-choice"><small>OPTIONAL ADD-ON · BETA</small><strong>Banked XP is in beta</strong><p>{bankedMethods.length ? "Estimate how far the supplies in your bank can take this grind. Method and supply coverage is still being expanded." : `Banked XP support is not available for ${skill} yet.`}</p><button type="button" aria-pressed={includeBankedXp} disabled={!bankedMethods.length} onClick={() => setIncludeBankedXp((value) => !value)}>{includeBankedXp ? <Check size={13} /> : <Plus size={13} />}{includeBankedXp ? "Banked XP added" : "Add banked XP"}</button></div>
            <button className="primary-action" disabled={Boolean(adding)} onClick={() => void addLevelGoal()}>{adding ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />} Add level grind</button>
          </div>
        ) : kind === "grind" ? <GrindCatalogResults results={displayedResults.filter((goal): goal is GrindGoal => goal.kind === "grind")} searchBy={grindSearchBy} adding={adding} onAdd={(goal) => void add(goal)} /> : <div className="quick-add-grid catalog-results">
          {displayedResults.map((goal) => (
            <button key={goal.id} disabled={Boolean(adding)} onClick={() => void add(goal)}>
              <span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span>
              <span><small>{goal.kind.toUpperCase()}</small><strong>{goal.title}</strong><em>{goal.kind === "quest" ? `${goal.requirements.length} skills · ${goal.prerequisites.length} subquests · ${goal.items.length} items` : goal.kind === "grind" ? `From ${goal.monster} · 1/${fullNumber(goal.dropRate)}` : goal.kind === "banked_xp" ? `${goal.activities.length} methods` : `${goal.targetLevel} ${goal.skill}`}</em></span>
              {adding === goal.id ? <LoaderCircle className="spin" size={17} /> : <Plus size={17} />}
            </button>
          ))}
        </div>}
        {kind !== "skill" && !loading && connected && query.length >= 2 && !displayedResults.length && <div className="catalog-empty"><CircleHelp size={19} /><strong>No catalog matches</strong><small>Try the exact Wiki name or a shorter search.</small></div>}
        {kind !== "skill" && !connected && displayedResults.length === 0 && <div className="catalog-empty"><CircleHelp size={19} /><strong>No bundled example</strong><small>Connect Supabase to search the full Wiki catalog.</small></div>}
        <p className="modal-hint"><CircleHelp size={15} /> {kind === "skill" ? "Level progress follows your synced RuneLite XP. Banked XP is optional and experimental." : connected ? "Requirements, NPC IDs, drop rates, and icons come from your imported OSRS Wiki catalog." : "Demo mode uses bundled examples. Configure Supabase for the full Wiki catalog."}</p>
      </div>
    </div>
  );
}

function GrindCatalogResults({ results, searchBy, adding, onAdd }: { results: GrindGoal[]; searchBy: "item" | "monster"; adding: string; onAdd: (goal: GrindGoal) => void }) {
  const [expanded, setExpanded] = useState("");
  const groups = new Map<string, { label: string; icon?: string; options: GrindGoal[] }>();
  for (const goal of results) {
    const key = searchBy === "item" ? `item-${goal.targetItemId}` : `monster-${goal.monster.toLowerCase()}`;
    const current = groups.get(key) ?? { label: searchBy === "item" ? goal.targetItemName : goal.monster, icon: searchBy === "item" ? goal.targetIcon : undefined, options: [] };
    if (!current.options.some((option) => option.id === goal.id)) current.options.push(goal);
    groups.set(key, current);
  }

  return (
    <div className="catalog-results grind-catalog-results">
      {[...groups].map(([key, group]) => {
        const open = expanded === key;
        return <section className={`grind-result-group ${open ? "open" : ""}`} key={key}>
          <button className="grind-result-heading" aria-expanded={open} onClick={() => setExpanded(open ? "" : key)}>
            {searchBy === "item" ? <span className="result-medallion"><ItemImage src={group.icon} alt={group.label} size={36} /></span> : <span className="result-medallion"><Target size={18} /></span>}
            <span><small>{searchBy === "item" ? "TARGET ITEM" : "MONSTER"}</small><strong>{group.label}</strong><em>{group.options.length} {searchBy === "item" ? `monster source${group.options.length === 1 ? "" : "s"}` : `notable drop${group.options.length === 1 ? "" : "s"}`}</em></span>
            <ChevronDown className={open ? "open" : ""} size={16} />
          </button>
          {open && <div className="grind-result-options"><small className="result-option-label">{searchBy === "item" ? "SELECT MONSTER SOURCE" : "SELECT TARGET DROP"}</small>{group.options.map((goal) => <button key={goal.id} disabled={Boolean(adding)} onClick={() => onAdd(goal)}>{searchBy === "item" ? <span className="goal-kind goal-kind--grind"><Target size={14} /></span> : <span className="option-item"><ItemImage src={goal.targetIcon} alt={goal.targetItemName} size={31} /></span>}<span><strong>{searchBy === "item" ? goal.monster : goal.targetItemName}</strong><small>{searchBy === "item" ? `${goal.targetItemName} · ` : ""}1/{fullNumber(goal.dropRate)}</small></span>{adding === goal.id ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}</button>)}</div>}
        </section>;
      })}
    </div>
  );
}

function ConnectDialog({ onClose, onReset, characterId, connected }: { onClose: () => void; onReset: () => void; characterId: string; connected: boolean }) {
  const [code, setCode] = useState(connected ? "" : "DEMO-CODE");
  const [expiresAt, setExpiresAt] = useState<string>();
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState("10:00");

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch("/api/plugin/v1/link/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ characterId }), signal: controller.signal })
      .then(async (response) => ({ ok: response.ok, body: await response.json().catch(() => ({})) }))
      .then(({ ok, body }) => ok ? (setCode(body.code), setExpiresAt(body.expiresAt)) : setError(body.error ?? "Could not generate a linking code."))
      .catch((reason) => { if (reason.name !== "AbortError") setError("Could not generate a linking code."); });
    return () => controller.abort();
  }, [characterId, connected]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(`${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-panel modal-panel--narrow">
        <header><div><small>RUNE LITE LINK</small><h2 id="connect-title">Connect this character</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
        <div className="link-illustration"><span><Unplug size={26} /></span><i /><span><Link2 size={26} /></span></div>
        <ol className="link-steps"><li><b>1</b><span>Install and open the Iron Path RuneLite plugin.</span></li><li><b>2</b><span>Paste this single-use code into its connection panel.</span></li></ol>
        <button className="link-code" disabled={!code} onClick={() => navigator.clipboard?.writeText(code)}><small>LINKING CODE · EXPIRES IN {connected ? remaining : "DEMO"}</small><strong>{code || (error ? "UNAVAILABLE" : "GENERATING…")}</strong><span>{error || "Click to copy"}</span></button>
        <p className="security-note"><Shield size={15} /> The plugin receives a revocable Iron Path device token. It never sees Jagex, RuneLite, or email credentials.</p>
        {!connected && <button className="text-button" onClick={() => { onReset(); onClose(); }}><RefreshCw size={14} /> Reset local demo data</button>}
      </div>
    </div>
  );
}

function Showcase({ profile, onVisibility, onGoalPublic, onSkill, onRecentCollections, onCollection }: { profile: CharacterProfile; onVisibility: (value: CharacterProfile["visibility"]) => void; onGoalPublic: (goal: Goal) => void; onSkill: (skill: string, value: boolean, sortOrder?: number) => void; onRecentCollections: (value: boolean) => void; onCollection: (sectionKey: string, selectionType: "section" | "item", value: boolean, displayMode: CollectionLogDisplayMode, itemId?: number) => void }) {
  const publicGoals = profile.goals.filter((goal) => goal.public);
  const orderedSkills = sortedSkills(profile.skills);
  const visibleSkills = visibleShowcaseSkills(profile.skills, profile.skillShowcase);
  const selectedSkillKeys = new Set(profile.skillShowcase.skills.map(skillShowcaseKey));
  const categoryOrder = ["Bosses", "Raids", "Clues", "Minigames", "Other"];
  const extraCategories = [...new Set(profile.collectionLog.map((section) => section.category))].filter((category) => !categoryOrder.includes(category)).sort((a, b) => a.localeCompare(b));
  const categories = [...categoryOrder, ...extraCategories];
  categories.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    return (aIndex < 0 ? categoryOrder.length : aIndex) - (bIndex < 0 ? categoryOrder.length : bIndex) || a.localeCompare(b);
  });
  const [collectionCategory, setCollectionCategory] = useState(categories[0] ?? "Bosses");
  const [collectionQuery, setCollectionQuery] = useState("");
  const [collectionSectionKey, setCollectionSectionKey] = useState(profile.collectionLog[0]?.key ?? "");
  const normalizedCollectionQuery = collectionQuery.trim().toLowerCase();
  const matchingCollectionSections = profile.collectionLog.filter((section) => {
    const inCategory = section.category === collectionCategory;
    const matchesQuery = !normalizedCollectionQuery || section.name.toLowerCase().includes(normalizedCollectionQuery)
      || section.category.toLowerCase().includes(normalizedCollectionQuery)
      || section.slots.some((slot) => slot.name.toLowerCase().includes(normalizedCollectionQuery));
    return matchesQuery && (normalizedCollectionQuery ? true : inCategory);
  });
  const selectedCollectionSection = matchingCollectionSections.find((section) => section.key === collectionSectionKey) ?? matchingCollectionSections[0];
  const sectionNameMatches = selectedCollectionSection
    ? selectedCollectionSection.name.toLowerCase().includes(normalizedCollectionQuery) || selectedCollectionSection.category.toLowerCase().includes(normalizedCollectionQuery)
    : false;
  const visibleCollectionSlots = selectedCollectionSection?.slots.filter((slot) => (
    !normalizedCollectionQuery || sectionNameMatches || slot.name.toLowerCase().includes(normalizedCollectionQuery)
  )) ?? [];
  const collectionObtained = profile.collectionLogTotals.obtainedCount;
  const collectionTotal = profile.collectionLogTotals.totalCount;
  return (
    <div className="showcase-layout">
      <section className="showcase-controls">
        <small>PUBLIC TROPHY CASE</small><h1>Choose what leaves the bank.</h1><p>Your profile starts private. Publish only the progress and drops you want other players to see.</p>
        <div className="publish-state"><span className={profile.visibility === "public" ? "live" : ""}>{profile.visibility === "public" ? <Eye size={18} /> : <LockKeyhole size={18} />}</span><div><strong>{profile.visibility === "public" ? "Profile is public" : "Profile is private"}</strong><small>/showcase/{profile.slug}</small></div><button onClick={() => onVisibility(profile.visibility === "public" ? "private" : "public")}>{profile.visibility === "public" ? "Unpublish" : "Publish"}</button></div>
        {profile.visibility === "public" && <button className="share-link" onClick={() => navigator.clipboard?.writeText(`${location.origin}/showcase/${profile.slug}`)}><Copy size={13} /> Copy public link</button>}
        <h2>Visible goals <span>{publicGoals.length}/{profile.goals.length}</span></h2>
        <div className="showcase-toggles">
          {profile.goals.map((goal) => <button key={goal.id} onClick={() => onGoalPublic(goal)}><span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span><strong>{goal.title}</strong><i className={goal.public ? "on" : ""}><b /></i></button>)}
        </div>
        <h2>Visible stats <span>{visibleSkills.length}/{profile.skills.length}</span></h2>
        <div className="skill-showcase-controls">
          <button className={`show-all-skills ${profile.skillShowcase.all ? "active" : ""}`} aria-pressed={profile.skillShowcase.all} onClick={() => onSkill("*", !profile.skillShowcase.all)}><BarChart3 size={17} /><span><strong>Show all stats</strong><small>{profile.skillShowcase.all ? "Every synced skill is public" : "Publish the full account build"}</small></span><i className={profile.skillShowcase.all ? "on" : ""}><b /></i></button>
          <div className="skill-showcase-picker">{orderedSkills.map((skill, index) => {
            const skillKey = skillShowcaseKey(skill.skill);
            const selected = profile.skillShowcase.all || selectedSkillKeys.has(skillKey);
            return <button className={selected ? "active" : ""} disabled={profile.skillShowcase.all} aria-pressed={selected} key={skillKey} onClick={() => onSkill(skill.skill, !selectedSkillKeys.has(skillKey), index)}><ItemImage src={skillIcon(skill.skill)} alt={skill.skill} size={23} /><span><strong>{skill.skill}</strong><small>Level {skill.level}</small></span>{selected ? <Eye size={12} /> : <EyeOff size={12} />}</button>;
          })}</div>
          {profile.skillShowcase.all && <small className="skill-showcase-hint">Turn off “Show all stats” to choose individual skills.</small>}
        </div>
        <div className="collection-heading"><span><h2>Collection log</h2><small>Boss and raid KC is included automatically with showcased logs</small></span><strong>{collectionObtained}/{collectionTotal}</strong></div>
        <div className="showcase-toggles collection-feature-toggles">
          <button aria-pressed={profile.showRecentCollections} onClick={() => onRecentCollections(!profile.showRecentCollections)}><Sparkles size={17} /><span><strong>Show recent collection items</strong><small>Automatically displays the latest 3 synced items</small></span><i className={profile.showRecentCollections ? "on" : ""}><b /></i></button>
        </div>
        {profile.collectionLog.length > 0 ? <div className="collection-browser">
          <label className="collection-search"><Search size={14} /><input value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} placeholder="Search sections or items" aria-label="Search collection log" />{collectionQuery && <button onClick={() => setCollectionQuery("")} aria-label="Clear collection search"><X size={13} /></button>}</label>
          <div className="collection-tabs" role="tablist" aria-label="Collection log categories">
            {categories.map((category) => <button role="tab" aria-selected={category === collectionCategory} className={category === collectionCategory ? "active" : ""} key={category} onClick={() => { setCollectionCategory(category); setCollectionQuery(""); setCollectionSectionKey(profile.collectionLog.find((section) => section.category === category)?.key ?? ""); }}><span>{category}</span><small>{profile.collectionLog.filter((section) => section.category === category).length}</small></button>)}
          </div>
          <div className="collection-browser-body">
            <nav className="collection-section-nav" aria-label="Collection log sections">
              {matchingCollectionSections.map((section) => <button className={`${section.key === selectedCollectionSection?.key ? "active" : ""}${section.totalCount > 0 && section.obtainedCount >= section.totalCount ? " green-logged" : ""}`} key={section.key} onClick={() => setCollectionSectionKey(section.key)}><span>{normalizedCollectionQuery && <small>{section.category}</small>}<strong>{section.name}</strong></span><em>{section.obtainedCount}/{section.totalCount}</em></button>)}
              {!matchingCollectionSections.length && <div className="collection-no-results"><Search size={17} /><span><strong>No matches</strong><small>Try another item or section.</small></span></div>}
            </nav>
            {selectedCollectionSection && <article className={`collection-section-detail${selectedCollectionSection.totalCount > 0 && selectedCollectionSection.obtainedCount >= selectedCollectionSection.totalCount ? " green-logged" : ""}`}>
              <header>
                <span><small>{selectedCollectionSection.category}</small><strong>{selectedCollectionSection.name}</strong><em>Scanned {timeAgo(selectedCollectionSection.capturedAt)}</em></span>
                <b>{selectedCollectionSection.obtainedCount}/{selectedCollectionSection.totalCount}</b>
              </header>
              <i className="collection-progress"><b style={{ width: `${Math.round(selectedCollectionSection.obtainedCount / Math.max(1, selectedCollectionSection.totalCount) * 100)}%` }} /></i>
              <div className="collection-section-settings">
                <label><span>Public display</span><select aria-label={`${selectedCollectionSection.name} display`} value={selectedCollectionSection.displayMode} disabled={!selectedCollectionSection.public} onChange={(event) => onCollection(selectedCollectionSection.key, "section", true, event.target.value as CollectionLogDisplayMode)}><option value="full">Full grid</option><option value="unlocked">Unlocked only</option><option value="summary">Summary</option></select></label>
                <button className={selectedCollectionSection.public ? "public" : ""} onClick={() => onCollection(selectedCollectionSection.key, "section", !selectedCollectionSection.public, selectedCollectionSection.displayMode)}>{selectedCollectionSection.public ? <Eye size={13} /> : <EyeOff size={13} />}<span>{selectedCollectionSection.public ? "Shown on profile" : "Hidden from profile"}</span><i><b /></i></button>
              </div>
              <div className="collection-slot-grid">
                {visibleCollectionSlots.map((slot) => <button className={`${slot.obtained ? "obtained" : "locked"}${slot.public ? " public" : ""}`} title={slot.obtained ? `${slot.public ? "Unpin" : "Pin"} ${slot.name}` : `${slot.name} has not been obtained`} disabled={!slot.obtained} key={slot.itemId} onClick={() => onCollection(selectedCollectionSection.key, "item", !slot.public, selectedCollectionSection.displayMode, slot.itemId)}><ItemImage src={slot.icon} alt={slot.name} size={34} />{slot.quantity > 1 && <b>{slot.quantity}×</b>}<small>{slot.name}</small>{slot.obtained && <span>{slot.public ? <Eye size={10} /> : <Plus size={10} />}</span>}</button>)}
              </div>
              <footer><span><Eye size={11} /> Select an obtained item to feature it</span><small>{visibleCollectionSlots.length}/{selectedCollectionSection.totalCount} items shown</small></footer>
            </article>}
          </div>
        </div> : <div className="collection-empty"><Gem size={20} /><span><strong>No sections scanned yet</strong><small>Open the Collection Log in-game while the plugin is connected.</small></span></div>}
      </section>

      <section className="showcase-preview">
        <div className="preview-label"><Eye size={14} /> PUBLIC PREVIEW</div>
        <div className="public-profile-card">
          <div className="profile-banner"><div className="banner-grid" /><span className="character-sigil">{characterInitials(profile.name)}</span><div><small>{accountTypeLabel(profile.accountType, profile.lastSyncedAt)}</small><h2>{profile.name}</h2><p>Combat {profile.combatLevel} · Total {profile.totalLevel}</p></div><span className="iron-seal"><Shield size={17} /> {profile.accountType === "Normal" ? "MAIN" : profile.accountType === "Unknown" ? profile.lastSyncedAt ? "SYNCED" : "UNLINKED" : "IRON"}</span></div>
          <div className="public-stats"><span><small>ACTIVE PATHS</small><strong>{publicGoals.length}</strong></span><span><small>COLLECTION LOG</small><strong>{profile.collectionLogTotals.obtainedCount}/{profile.collectionLogTotals.totalCount}</strong></span><span><small>COMBAT LEVEL</small><strong>{profile.combatLevel}</strong></span><span><small>TOTAL LEVEL</small><strong>{profile.totalLevel}</strong></span></div>
          <SkillShowcase skills={profile.skills} selection={profile.skillShowcase} />
          {publicGoals.length > 0 && <div className="public-goals">
            {publicGoals.map((goal) => {
              const meta = goalMeta(goal, profile);
              return <div key={goal.id}><span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span><span><small>{goal.kind.replace("_", " ")}</small><strong>{goal.title}</strong><i><b style={{ width: `${meta.percent}%` }} /></i></span><em>{meta.label}</em></div>;
            })}
          </div>}
          <CollectionLogShowcase sections={profile.collectionLog} killCounts={profile.killCounts} recentCollections={profile.recentCollections} showRecent={profile.showRecentCollections} />
          <footer><span className="brand-mark brand-mark--small" aria-hidden="true" /><strong>IRON PATH</strong><small>Data synced from RuneLite</small></footer>
        </div>
      </section>
    </div>
  );
}

function CharacterDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (character: CharacterSummary) => void }) {
  return <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="character-create-title">
    <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
    <div className="modal-panel modal-panel--narrow character-create-panel">
      <header><div><small>VERIFIED JOURNAL</small><h2 id="character-create-title">Add a RuneLite character</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
      <p>The journal is created from the logged-in RuneLite character, never from an unverified name.</p>
      <CharacterEnrollment onCreated={onCreated} />
    </div>
  </div>;
}

function AccountDialog({ onClose, connected }: { onClose: () => void; connected: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (!connected) return router.push("/login");
    setBusy(true);
    await createBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    if (!connected || !window.confirm("Delete your Iron Path account, characters, goals, and loot history? This cannot be undone.")) return;
    if (!window.confirm("Final confirmation: permanently delete all Iron Path data?")) return;
    setBusy(true);
    const response = await fetch("/api/app/account", { method: "DELETE" });
    if (response.ok) {
      await createBrowserClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } else {
      setBusy(false);
    }
  }

  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="account-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-panel modal-panel--narrow account-panel">
        <header><div><small>ACCOUNT</small><h2 id="account-title">Journal settings</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
        <p>Your Jagex credentials never enter Iron Path. Signing out only ends this web session.</p>
        <button disabled={busy} onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
        {connected && <button className="danger-action" disabled={busy} onClick={() => void deleteAccount()}><Trash2 size={16} /> Delete account and all data</button>}
      </div>
    </div>
  );
}

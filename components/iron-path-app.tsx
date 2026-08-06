"use client";

import {
  BookOpen, Check, ChevronDown, ChevronRight, CircleHelp, ExternalLink,
  Eye, EyeOff, Gem, LayoutDashboard, Link2, LockKeyhole, Menu, MoreHorizontal,
  Plus, RefreshCw, Search, Settings, Shield, Sparkles, Target,
  Trophy, Unplug, UserRound, X, Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { bankedXp, compactNumber, fullNumber, grindProgress, ownedQuantity, questReadiness } from "@/lib/calculations";
import { demoProfile, quickAddGoals } from "@/lib/demo-data";
import { skillIcon } from "@/lib/icons";
import type { BankedXpGoal, CharacterProfile, Goal, GrindGoal, QuestGoal } from "@/lib/types";
import { ItemImage } from "./item-image";

const STORAGE_KEY = "iron-path-demo-profile-v1";

function readProfile(): CharacterProfile {
  if (typeof window === "undefined") return demoProfile;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as CharacterProfile : demoProfile;
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

function goalIcon(goal: Goal) {
  if (goal.kind === "quest") return <BookOpen size={16} />;
  if (goal.kind === "grind") return <Target size={16} />;
  return <Zap size={16} />;
}

function goalMeta(goal: Goal, profile: CharacterProfile) {
  if (goal.kind === "quest") {
    const skills = Object.fromEntries(profile.skills.map((skill) => [skill.skill, skill.level]));
    const value = questReadiness(goal, profile.items, skills);
    return { label: `${value.ready}/${value.total} ready`, percent: value.percent };
  }
  if (goal.kind === "grind") {
    const value = grindProgress(goal);
    return { label: `${fullNumber(value.kc)} kc`, percent: Math.min(100, value.rateProgress) };
  }
  const value = bankedXp(goal);
  return { label: `Level ${value.projectedLevel} banked`, percent: value.percent };
}

export function IronPathApp() {
  const [profile, setProfile] = useState<CharacterProfile>(demoProfile);
  const [selectedId, setSelectedId] = useState(demoProfile.goals[0].id);
  const [mobileNav, setMobileNav] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // This is deliberately client-only: localStorage cannot be read during the server render.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = readProfile();
    setProfile(stored);
    setSelectedId(stored.goals[0]?.id ?? "");
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  }, [profile, hydrated]);

  const selected = profile.goals.find((goal) => goal.id === selectedId) ?? profile.goals[0];
  const filteredGoals = profile.goals.filter((goal) => goal.title.toLowerCase().includes(query.toLowerCase()));

  const updateGoal = (goalId: string, mutate: (goal: Goal) => Goal) => {
    setProfile((current) => ({ ...current, goals: current.goals.map((goal) => goal.id === goalId ? mutate(goal) : goal) }));
  };

  const addGoal = (goal: Goal) => {
    if (profile.goals.some((existing) => existing.id === goal.id)) {
      setSelectedId(goal.id);
    } else {
      setProfile((current) => ({ ...current, goals: [...current.goals, goal] }));
      setSelectedId(goal.id);
    }
    setAddOpen(false);
  };

  const resetDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setProfile(demoProfile);
    setSelectedId(demoProfile.goals[0].id);
  };

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileNav ? "sidebar--open" : ""}`}>
        <div className="brand-lockup">
          <span className="brand-mark"><span />IP</span>
          <div><strong>IRON PATH</strong><small>field journal</small></div>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <button className="character-card">
          <span className="character-sigil">IV</span>
          <span><strong>{profile.name}</strong><small>{profile.accountType} · {profile.totalLevel}</small></span>
          <ChevronDown size={15} />
        </button>

        <nav className="primary-nav" aria-label="Primary navigation">
          <button className={!showcaseMode ? "active" : ""} onClick={() => setShowcaseMode(false)}><LayoutDashboard size={17} /> Journal</button>
          <button onClick={() => setAddOpen(true)}><Plus size={17} /> New goal</button>
          <button className={showcaseMode ? "active" : ""} onClick={() => setShowcaseMode(true)}><Trophy size={17} /> Showcase</button>
        </nav>

        <div className="side-heading"><span>ACTIVE GOALS</span><span>{profile.goals.length}</span></div>
        <div className="goal-nav-list">
          {profile.goals.map((goal) => {
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

        <div className="sidebar-footer">
          <button onClick={() => setConnectOpen(true)}><span className="connection-dot" /> RuneLite connected</button>
          <button><Settings size={16} /> Settings</button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="crumbs"><span>{profile.name}</span><ChevronRight size={13} /><strong>{showcaseMode ? "Showcase" : selected?.title ?? "Journal"}</strong></div>
          <div className="topbar-actions">
            <span className="sync-note"><RefreshCw size={13} /> Synced {timeAgo(profile.lastSyncedAt)}</span>
            <button className="ghost-button" onClick={() => setConnectOpen(true)}><Link2 size={15} /> Plugin</button>
            <button className="avatar-button" aria-label="Account menu"><UserRound size={17} /></button>
          </div>
        </header>

        <div className="workspace">
          {showcaseMode ? (
            <Showcase profile={profile} onChange={setProfile} />
          ) : (
            <>
              <section className="goal-column">
                <div className="column-toolbar">
                  <label className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter your goals" /></label>
                  <button className="square-button" onClick={() => setAddOpen(true)} aria-label="Add goal"><Plus size={17} /></button>
                </div>
                <div className="goal-card-list">
                  {filteredGoals.map((goal, index) => <GoalCard key={goal.id} goal={goal} profile={profile} active={goal.id === selectedId} index={index} onSelect={() => setSelectedId(goal.id)} />)}
                </div>
                <button className="add-goal-card" onClick={() => setAddOpen(true)}><Plus size={19} /><span><strong>Mark a new path</strong><small>Quest, grind, or banked XP</small></span></button>
              </section>

              <section className="detail-column">
                {selected?.kind === "quest" && <QuestDetail goal={selected} profile={profile} onUpdate={(goal) => updateGoal(goal.id, () => goal)} />}
                {selected?.kind === "grind" && <GrindDetail goal={selected} onUpdate={(goal) => updateGoal(goal.id, () => goal)} />}
                {selected?.kind === "banked_xp" && <XpDetail goal={selected} onUpdate={(goal) => updateGoal(goal.id, () => goal)} />}
              </section>
            </>
          )}
        </div>
      </main>

      {mobileNav && <button className="scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      {addOpen && <AddGoalDialog onClose={() => setAddOpen(false)} onAdd={addGoal} existing={profile.goals.map((goal) => goal.id)} />}
      {connectOpen && <ConnectDialog onClose={() => setConnectOpen(false)} onReset={resetDemo} />}
    </div>
  );
}

function GoalCard({ goal, profile, active, index, onSelect }: { goal: Goal; profile: CharacterProfile; active: boolean; index: number; onSelect: () => void }) {
  const meta = goalMeta(goal, profile);
  return (
    <button className={`goal-card ${active ? "goal-card--active" : ""}`} style={{ animationDelay: `${index * 70}ms` }} onClick={onSelect}>
      <span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span>
      <span className="goal-card-main">
        <span className="goal-card-top"><em>{goal.kind === "banked_xp" ? "BANKED XP" : goal.kind.toUpperCase()}</em>{goal.public ? <Eye size={13} /> : <LockKeyhole size={12} />}</span>
        <strong>{goal.title}</strong>
        <span className="progress-track"><i style={{ width: `${meta.percent}%` }} /></span>
        <small>{meta.label}<b>{meta.percent}%</b></small>
      </span>
    </button>
  );
}

function DetailHeader({ eyebrow, title, subtitle, icon, publicValue, onPublic }: { eyebrow: string; title: string; subtitle: string; icon: React.ReactNode; publicValue: boolean; onPublic: () => void }) {
  return (
    <header className="detail-header">
      <span className="detail-medallion">{icon}</span>
      <div><small>{eyebrow}</small><h1>{title}</h1><p>{subtitle}</p></div>
      <button className="icon-button" aria-label="More actions"><MoreHorizontal size={19} /></button>
      <button className={`visibility-pill ${publicValue ? "public" : ""}`} onClick={onPublic}>{publicValue ? <Eye size={13} /> : <EyeOff size={13} />}{publicValue ? "Showcased" : "Private"}</button>
    </header>
  );
}

function QuestDetail({ goal, profile, onUpdate }: { goal: QuestGoal; profile: CharacterProfile; onUpdate: (goal: QuestGoal) => void }) {
  const skills = Object.fromEntries(profile.skills.map((skill) => [skill.skill, skill.level]));
  const readiness = questReadiness(goal, profile.items, skills);
  return (
    <div className="detail-page">
      <DetailHeader eyebrow="QUEST PATH" title={goal.title} subtitle={goal.description} icon={<BookOpen size={27} />} publicValue={goal.public} onPublic={() => onUpdate({ ...goal, public: !goal.public })} />
      <div className="readiness-strip">
        <div className="readiness-ring" style={{ "--progress": `${readiness.percent * 3.6}deg` } as React.CSSProperties}><span>{readiness.percent}<small>%</small></span></div>
        <div><small>READINESS</small><strong>{readiness.ready} of {readiness.total} requirements met</strong><p>RuneLite will complete this path when your quest state changes.</p></div>
        <a href={goal.wikiUrl} target="_blank" rel="noreferrer">Wiki guide <ExternalLink size={13} /></a>
      </div>

      <Section title="Skill requirements" count={`${goal.requirements.filter((item) => (skills[item.skill] ?? 1) >= item.level).length}/${goal.requirements.length}`}>
        <div className="skill-grid">
          {goal.requirements.map((requirement) => {
            const current = skills[requirement.skill] ?? 1;
            const ready = current >= requirement.level;
            return (
              <div className={ready ? "ready" : "missing"} key={requirement.skill}>
                <ItemImage src={skillIcon(requirement.skill)} alt={requirement.skill} size={31} />
                <span><small>{requirement.skill}</small><strong>{current}<i>/ {requirement.level}</i></strong></span>
                {ready ? <Check size={15} /> : <span className="level-gap">+{requirement.level - current}</span>}
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
              <button key={item.id} className={ready ? "ready" : "missing"} onClick={() => item.manual && onUpdate({ ...goal, items: goal.items.map((row) => row.id === item.id ? { ...row, complete: !row.complete } : row) })}>
                <ItemImage src={item.icon} alt={item.name} size={37} />
                <span><strong>{item.name}</strong><small>{item.note ?? (item.manual ? "Manual check" : `${fullNumber(owned)} in containers`)}</small></span>
                {item.manual ? <span className={`manual-check ${ready ? "checked" : ""}`}>{ready && <Check size={13} />}</span> : <span className="quantity-readout"><strong>{fullNumber(owned)}</strong><small>/ {item.quantity}</small></span>}
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Quest line" count={`${goal.prerequisites.filter((quest) => quest.state === "finished").length}/${goal.prerequisites.length}`}>
        <div className="quest-chain">
          {goal.prerequisites.map((quest, index) => <div key={quest.name}><span>{index + 1}</span><strong>{quest.name}</strong><small><Check size={12} /> Complete</small></div>)}
        </div>
      </Section>
    </div>
  );
}

function GrindDetail({ goal, onUpdate }: { goal: GrindGoal; onUpdate: (goal: GrindGoal) => void }) {
  const progress = grindProgress(goal);
  return (
    <div className="detail-page">
      <DetailHeader eyebrow={`ITEM GRIND · ${goal.monster.toUpperCase()}`} title={goal.title} subtitle={`Hunting ${goal.targetItemName} at a 1/${fullNumber(goal.dropRate)} drop rate.`} icon={<ItemImage src={goal.targetIcon} alt={goal.targetItemName} size={54} />} publicValue={goal.public} onPublic={() => onUpdate({ ...goal, public: !goal.public })} />
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
            <button key={drop.itemId} className={drop.public ? "public" : ""} onClick={() => onUpdate({ ...goal, drops: goal.drops.map((item) => item.itemId === drop.itemId ? { ...item, public: !item.public } : item) })}>
              <span className="drop-spark" />
              <ItemImage src={drop.icon} alt={drop.name} size={52} />
              <strong>{drop.quantity}<small>×</small></strong>
              <span><b>{drop.name}</b><small>{drop.rarity} · {drop.source}</small></span>
              {drop.public ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          ))}
        </div>
      </Section>

      <div className="event-note"><Sparkles size={17} /><span><strong>Observed loot is append-only.</strong> Replayed events are ignored by event ID, so reconnecting the plugin will not inflate KC.</span></div>
    </div>
  );
}

function XpDetail({ goal, onUpdate }: { goal: BankedXpGoal; onUpdate: (goal: BankedXpGoal) => void }) {
  const summary = bankedXp(goal);
  return (
    <div className="detail-page">
      <DetailHeader eyebrow="BANKED EXPERIENCE" title={goal.title} subtitle={`Turn your bank into a clear path from ${goal.currentLevel} to ${goal.targetLevel} ${goal.skill}.`} icon={<ItemImage src={skillIcon(goal.skill)} alt={goal.skill} size={48} />} publicValue={goal.public} onPublic={() => onUpdate({ ...goal, public: !goal.public })} />
      <div className="xp-ledger">
        <div><small>CURRENT XP</small><strong>{fullNumber(goal.currentXp)}</strong><span>Level {goal.currentLevel}</span></div>
        <ChevronRight size={21} />
        <div className="accent"><small>BANKED XP</small><strong>+{fullNumber(summary.banked)}</strong><span>{goal.activities.length} item groups</span></div>
        <ChevronRight size={21} />
        <div><small>PROJECTED</small><strong>Level {summary.projectedLevel}</strong><span>{fullNumber(summary.remaining)} xp short</span></div>
      </div>
      <div className="xp-progress"><span><i style={{ width: `${summary.percent}%` }} /></span><small>{summary.percent}% of the remaining path banked</small></div>

      <Section title="Banked activities" count={`${goal.activities.length} methods`}>
        <div className="activity-list">
          {goal.activities.map((activity) => (
            <div key={activity.id}>
              <ItemImage src={activity.inputIcon} alt={activity.inputName} size={44} />
              <span><strong>{activity.inputName}</strong><small>{activity.label} · {activity.xpEach} xp each</small></span>
              <span className="activity-qty"><small>IN BANK</small><strong>{fullNumber(activity.quantity)}</strong></span>
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

function Section({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return <section className="detail-section"><header><h2>{title}</h2><span>{count}</span></header>{children}</section>;
}

function Toggle({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: () => void }) {
  return <button onClick={onChange}><span><strong>{label}</strong><small>{detail}</small></span><i className={value ? "on" : ""}><b /></i></button>;
}

function AddGoalDialog({ onClose, onAdd, existing }: { onClose: () => void; onAdd: (goal: Goal) => void; existing: string[] }) {
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="add-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-panel">
        <header><div><small>ADD TO YOUR JOURNAL</small><h2 id="add-title">Choose the next path</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
        <label className="modal-search"><Search size={16} /><input autoFocus placeholder="Search Wiki quests, monsters, or skills" /></label>
        <div className="quick-add-grid">
          {quickAddGoals.map((goal) => (
            <button key={goal.id} onClick={() => onAdd(goal)}>
              <span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span>
              <span><small>{goal.kind === "banked_xp" ? "BANKED XP" : goal.kind.toUpperCase()}</small><strong>{goal.title}</strong><em>{goal.kind === "quest" ? "Wiki requirements" : goal.kind === "grind" ? `1/${fullNumber(goal.dropRate)} target` : `${goal.activities.length} banked methods`}</em></span>
              {existing.includes(goal.id) ? <Check size={17} /> : <Plus size={17} />}
            </button>
          ))}
        </div>
        <p className="modal-hint"><CircleHelp size={15} /> The production catalog is populated nightly from the OSRS Wiki. These three records are bundled for offline development.</p>
      </div>
    </div>
  );
}

function ConnectDialog({ onClose, onReset }: { onClose: () => void; onReset: () => void }) {
  const [code] = useState("IRON-7K2Q");
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <button className="modal-backdrop" onClick={onClose} aria-label="Close" />
      <div className="modal-panel modal-panel--narrow">
        <header><div><small>RUNE LITE LINK</small><h2 id="connect-title">Connect this character</h2></div><button className="icon-button" onClick={onClose}><X size={19} /></button></header>
        <div className="link-illustration"><span><Unplug size={26} /></span><i /><span><Link2 size={26} /></span></div>
        <ol className="link-steps"><li><b>1</b><span>Install and open the Iron Path RuneLite plugin.</span></li><li><b>2</b><span>Paste this single-use code into its connection panel.</span></li></ol>
        <button className="link-code" onClick={() => navigator.clipboard?.writeText(code)}><small>LINKING CODE · EXPIRES IN 09:42</small><strong>{code}</strong><span>Click to copy</span></button>
        <p className="security-note"><Shield size={15} /> The plugin receives a revocable Iron Path device token. It never sees Jagex, RuneLite, Discord, or email credentials.</p>
        <button className="text-button" onClick={() => { onReset(); onClose(); }}><RefreshCw size={14} /> Reset local demo data</button>
      </div>
    </div>
  );
}

function Showcase({ profile, onChange }: { profile: CharacterProfile; onChange: (profile: CharacterProfile) => void }) {
  const publicGoals = profile.goals.filter((goal) => goal.public);
  return (
    <div className="showcase-layout">
      <section className="showcase-controls">
        <small>PUBLIC TROPHY CASE</small><h1>Choose what leaves the bank.</h1><p>Your profile starts private. Publish only the progress and drops you want other players to see.</p>
        <div className="publish-state"><span className={profile.visibility === "public" ? "live" : ""}>{profile.visibility === "public" ? <Eye size={18} /> : <LockKeyhole size={18} />}</span><div><strong>{profile.visibility === "public" ? "Profile is public" : "Profile is private"}</strong><small>ironpath.gg/u/{profile.slug}</small></div><button onClick={() => onChange({ ...profile, visibility: profile.visibility === "public" ? "private" : "public" })}>{profile.visibility === "public" ? "Unpublish" : "Publish"}</button></div>
        <h2>Visible goals <span>{publicGoals.length}/{profile.goals.length}</span></h2>
        <div className="showcase-toggles">
          {profile.goals.map((goal) => <button key={goal.id} onClick={() => onChange({ ...profile, goals: profile.goals.map((item) => item.id === goal.id ? { ...item, public: !item.public } : item) })}><span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span><strong>{goal.title}</strong><i className={goal.public ? "on" : ""}><b /></i></button>)}
        </div>
      </section>

      <section className="showcase-preview">
        <div className="preview-label"><Eye size={14} /> PUBLIC PREVIEW</div>
        <div className="public-profile-card">
          <div className="profile-banner"><div className="banner-grid" /><span className="character-sigil">IV</span><div><small>{profile.accountType}</small><h2>{profile.name}</h2><p>Combat {profile.combatLevel} · Total {profile.totalLevel}</p></div><span className="iron-seal"><Shield size={17} /> IRON</span></div>
          <div className="public-stats"><span><small>ACTIVE PATHS</small><strong>{publicGoals.length}</strong></span><span><small>TOTAL LEVEL</small><strong>{profile.totalLevel}</strong></span><span><small>LAST SYNC</small><strong>{timeAgo(profile.lastSyncedAt)}</strong></span></div>
          <div className="public-goals">
            {publicGoals.map((goal) => {
              const meta = goalMeta(goal, profile);
              return <div key={goal.id}><span className={`goal-kind goal-kind--${goal.kind}`}>{goalIcon(goal)}</span><span><small>{goal.kind.replace("_", " ")}</small><strong>{goal.title}</strong><i><b style={{ width: `${meta.percent}%` }} /></i></span><em>{meta.label}</em></div>;
            })}
            {!publicGoals.length && <div className="empty-showcase"><Gem size={24} /><span><strong>Nothing showcased yet</strong><small>Toggle a goal on the left.</small></span></div>}
          </div>
          <footer><span className="brand-mark brand-mark--small"><span />IP</span><strong>IRON PATH</strong><small>Data synced from RuneLite</small></footer>
        </div>
      </section>
    </div>
  );
}

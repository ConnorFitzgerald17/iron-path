import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleCheck,
  Gem,
  LockKeyhole,
  PackageCheck,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { runeLiteItemIcon } from "@/lib/icons";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Iron Path — Your Old School journey, properly tracked",
  description: "Turn your iron account into a living progress journal for quests, grinds, banked XP, and the drops worth remembering.",
};

const features = [
  {
    icon: BookOpen,
    number: "01",
    title: "Know when you’re quest-ready",
    body: "See skill, item, and prerequisite progress together. Iron Path turns a wiki checklist into a plan built around your account.",
    className: styles.featureQuest,
  },
  {
    icon: Target,
    number: "02",
    title: "Make every kill count",
    body: "Track the drop you’re chasing, your live kill count, and the side loot collected along the way.",
    className: styles.featureGrind,
  },
  {
    icon: Zap,
    number: "03",
    title: "See the levels in your bank",
    body: "Turn bones, herbs, logs, and other supplies into a clear banked-XP plan with level-aware methods.",
    className: styles.featureXp,
  },
  {
    icon: Trophy,
    number: "04",
    title: "Keep a trophy case",
    body: "Curate collection-log unlocks, goals, and skill milestones into a public showcase that shares only what you choose.",
    className: styles.featureTrophy,
  },
];

export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand} aria-label="Iron Path home">
          <span className={styles.brandMark} aria-hidden="true" />
          <span><strong>IRON PATH</strong><small>THE ROAD REMEMBERS</small></span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#showcase">Showcase</a>
        </nav>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
          <Link href="/journal" className={styles.navCta}>Open journal <ArrowRight size={14} /></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><Sparkles size={12} /> Built for Old School iron accounts</span>
          <h1>Every grind has<br />a <em>story.</em></h1>
          <p>Iron Path turns your account into a living progress journal—so you always know what you’re working toward, what stands in the way, and how far you’ve come.</p>
          <div className={styles.heroActions}>
            <Link href="/demo" className={styles.primaryCta}>Explore the demo <ArrowRight size={16} /></Link>
            <a href="#features" className={styles.secondaryCta}>See what it tracks <ChevronRight size={15} /></a>
          </div>
          <div className={styles.trustLine}>
            <span><ShieldCheck size={14} /> No Jagex credentials</span>
            <span><LockKeyhole size={14} /> Private by default</span>
            <span><Swords size={14} /> RuneLite-powered</span>
          </div>
        </div>

        <div className={styles.previewWrap} aria-label="Preview of the Iron Path journal">
          <div className={styles.previewOrnament} aria-hidden="true">✦</div>
          <div className={styles.previewWindow}>
            <div className={styles.windowBar}>
              <span><i /><i /><i /></span>
              <small>IRON PATH / JOURNAL</small>
              <span className={styles.windowSync}><i /> SYNCED</span>
            </div>
            <div className={styles.previewBody}>
              <aside className={styles.previewSidebar}>
                <div className={styles.miniBrand}><span className={styles.brandMark} /><b>IRON PATH</b></div>
                <div className={styles.character}><span>CR</span><div><b>CinderRoad</b><small>IRONMAN · LVL 104</small></div></div>
                <ul>
                  <li className={styles.active}><ScrollText size={12} /> Journal</li>
                  <li><Trophy size={12} /> Showcase</li>
                  <li><PackageCheck size={12} /> Collection log</li>
                </ul>
                <div className={styles.syncCard}><i /><span><b>RuneLite connected</b><small>Updated just now</small></span></div>
              </aside>
              <div className={styles.previewMain}>
                <div className={styles.previewHeading}><div><small>PATH OVERVIEW</small><b>Good evening, CinderRoad.</b></div><span>3 ACTIVE GOALS</span></div>
                <div className={styles.statRow}>
                  <article><small>TOTAL LEVEL</small><b>1,742</b><span>+18 this month</span></article>
                  <article><small>COLLECTION LOG</small><b>412 <em>/ 1,590</em></b><span>26% discovered</span></article>
                  <article><small>GOALS COMPLETE</small><b>17</b><span>4 this month</span></article>
                </div>
                <div className={styles.previewGrid}>
                  <div className={styles.goalPanel}>
                    <header><span>ACTIVE PATHS</span><small>VIEW ALL</small></header>
                    <article>
                      <span className={styles.goalIcon}><BookOpen size={13} /></span>
                      <div><small>QUEST</small><b>Dragon Slayer II</b><i><span style={{ width: "78%" }} /></i><em>14 of 18 requirements ready</em></div>
                      <strong>78%</strong>
                    </article>
                    <article>
                      <span className={`${styles.goalIcon} ${styles.goalIconRed}`}><Target size={13} /></span>
                      <div><small>ITEM GRIND</small><b>Dragon warhammer</b><i><span style={{ width: "66%" }} /></i><em>2,467 / 3,000 drop rate</em></div>
                      <strong>82%</strong>
                    </article>
                  </div>
                  <div className={styles.readinessPanel}>
                    <small>QUEST READINESS</small>
                    <div className={styles.readinessRing}><span>78<small>%</small></span></div>
                    <b>Nearly there.</b>
                    <p>4 requirements stand between you and the Myths&apos; Guild.</p>
                    <span className={styles.readyNote}><CircleCheck size={11} /> 14 requirements met</span>
                  </div>
                </div>
                <div className={styles.collectionShelf}>
                  <header><span>RECENT COLLECTIONS</span><small>THE GAUNTLET · 5 / 7</small></header>
                  <div>
                    <article className={styles.collectionNew}>
                      {/* RuneLite item sprites preserve the in-game Collection Log look. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={runeLiteItemIcon(23956)} alt="Crystal armour seed" width="28" height="28" />
                      <span><b>Crystal armour seed</b><small>NEW UNLOCK · 18M AGO</small></span>
                    </article>
                    <article>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={runeLiteItemIcon(4714)} alt="Ahrim's robeskirt" width="28" height="28" />
                      <span><b>Ahrim&apos;s robeskirt</b><small>BARROWS CHESTS</small></span>
                    </article>
                    <article>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={runeLiteItemIcon(4708)} alt="Ahrim's hood" width="28" height="28" />
                      <span><b>Ahrim&apos;s hood</b><small>BARROWS CHESTS</small></span>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.promiseStrip} aria-label="Iron Path product promise">
        <span>QUEST READINESS</span><i>◆</i><span>ITEM GRINDS</span><i>◆</i><span>BANKED XP</span><i>◆</i><span>COLLECTION LOG</span><i>◆</i><span>PUBLIC SHOWCASES</span>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionIntro}>
          <span className={styles.eyebrow}>One account. One clear path.</span>
          <h2>Built for the parts of the journey<br />that spreadsheets forget.</h2>
          <p>Your iron is more than a total level. Iron Path connects your long-term goals to the live state of your account.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, number, title, body, className }) => (
            <article className={`${styles.featureCard} ${className}`} key={number}>
              <div><span><Icon size={19} /></span><small>{number}</small></div>
              <h3>{title}</h3>
              <p>{body}</p>
              <span className={styles.cardLine} />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.how} id="how-it-works">
        <div className={styles.howCopy}>
          <span className={styles.eyebrow}>From game to journal</span>
          <h2>Play the game.<br /><em>Your path keeps up.</em></h2>
          <p>The companion RuneLite plugin keeps the journal grounded in your actual account, while you decide what to plan and what to share.</p>
          <Link href="/demo" className={styles.textLink}>Try it with demo data <ArrowRight size={15} /></Link>
        </div>
        <ol className={styles.steps}>
          <li><span>01</span><div><b>Link your character</b><p>Connect each RuneScape profile to its own journal without handing over your Jagex credentials.</p></div><Check size={17} /></li>
          <li><span>02</span><div><b>Keep playing Old School</b><p>Skills, quests, bank items, kill counts, loot, and collection progress flow in through RuneLite.</p></div><Check size={17} /></li>
          <li><span>03</span><div><b>Choose the next path</b><p>Build goals, spot blockers, track the grind, and share only the wins you want the world to see.</p></div><Check size={17} /></li>
        </ol>
      </section>

      <section className={styles.showcase} id="showcase">
        <div className={styles.showcaseCard}>
          <div className={styles.showcaseRunes} aria-hidden="true" />
          <span className={styles.showcaseAvatar}>CR</span>
          <small>IRON PATH OF</small>
          <h3>CinderRoad</h3>
          <p>IRONMAN · COMBAT 104 · TOTAL 1,742</p>
          <div className={styles.trophies}>
            <article><span><Gem size={18} /></span><div><small>RECENT UNLOCK</small><b>Crystal armour seed</b><em>The Gauntlet · 287 KC</em></div></article>
            <article><span><Trophy size={18} /></span><div><small>PATH COMPLETED</small><b>Recipe for Disaster</b><em>Quest goal · Complete</em></div></article>
          </div>
        </div>
        <div className={styles.showcaseCopy}>
          <span className={styles.eyebrow}>A trophy case that feels earned</span>
          <h2>Some drops deserve<br />more than a screenshot.</h2>
          <p>Build a public profile from the milestones that matter to you. Skills stay private unless you publish them, and every showcase can be tuned item by item.</p>
          <ul>
            <li><Check size={14} /> Share selected goals and unlocks</li>
            <li><Check size={14} /> Keep the rest of your account private</li>
            <li><Check size={14} /> Celebrate verified achievements in Discord</li>
          </ul>
        </div>
      </section>

      <section className={styles.finalCta}>
        <span className={styles.brandMark} aria-hidden="true" />
        <small>YOUR NEXT MILESTONE IS ALREADY WAITING</small>
        <h2>Give the grind somewhere to go.</h2>
        <p>Open the interactive demo and see what your Old School journey could look like with a path.</p>
        <div className={styles.heroActions}>
          <Link href="/demo" className={styles.primaryCta}>Explore Iron Path <ArrowRight size={16} /></Link>
          <Link href="/login" className={styles.secondaryCta}>Sign in</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}><span className={styles.brandMark} aria-hidden="true" /><span><strong>IRON PATH</strong><small>THE ROAD REMEMBERS</small></span></div>
        <p>An independent progress journal for Old School RuneScape iron accounts.<br />Not affiliated with Jagex Ltd.</p>
        <div><a href="#features">Features</a><Link href="/demo">Demo</Link><Link href="/login">Sign in</Link></div>
      </footer>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Eye,
  MousePointerClick,
  RefreshCw,
  Route,
  ShieldCheck,
  Smartphone,
  UserPlus,
  Users,
} from "lucide-react";
import { analyticsRange, isAnalyticsAdmin, loadAnalyticsDashboard } from "@/lib/server/analytics";
import { authenticatedUser } from "@/lib/server/app-auth";
import styles from "./analytics.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private analytics — Iron Path",
  robots: { index: false, follow: false },
};

const eventLabels: Record<string, string> = {
  login_started: "Magic links requested",
  goal_created: "Goals created",
  goal_completed: "Goals completed",
  goal_reopened: "Goals reopened",
  goal_deleted: "Goals deleted",
  character_switched: "Characters switched",
  showcase_opened: "Showcases opened",
  profile_published: "Profiles published",
  plugin_link_started: "Plugin links started",
};

function integer(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function dateTime(value: string | null) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(value));
}

function LineChart({ rows }: { rows: Array<{ date: string; visitors: number; pageViews: number }> }) {
  const width = 900;
  const height = 220;
  const inset = 12;
  const max = Math.max(1, ...rows.map((row) => row.pageViews));
  const points = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : inset + (index / (rows.length - 1)) * (width - inset * 2);
    const y = height - inset - (row.pageViews / max) * (height - inset * 2);
    return `${x},${y}`;
  }).join(" ");
  const visitorPoints = rows.map((row, index) => {
    const x = rows.length === 1 ? width / 2 : inset + (index / (rows.length - 1)) * (width - inset * 2);
    const y = height - inset - (row.visitors / max) * (height - inset * 2);
    return `${x},${y}`;
  }).join(" ");

  return <div className={styles.chart}>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Daily visitors and page views">
      <defs>
        <linearGradient id="analytics-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d5ad55" stopOpacity=".25" /><stop offset="1" stopColor="#d5ad55" stopOpacity="0" /></linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((line) => <line key={line} x1="0" x2={width} y1={(height / 4) * line} y2={(height / 4) * line} />)}
      {points && <polygon points={`${inset},${height - inset} ${points} ${width - inset},${height - inset}`} fill="url(#analytics-area)" />}
      <polyline points={points} className={styles.viewsLine} />
      <polyline points={visitorPoints} className={styles.visitorsLine} />
    </svg>
    <div className={styles.chartLabels}><span>{rows[0] ? date(rows[0].date) : "No data"}</span><span>{rows.at(-1) ? date(rows.at(-1)!.date) : ""}</span></div>
  </div>;
}

function Breakdown({ rows, total }: { rows: Array<{ name: string; visitors: number }>; total: number }) {
  if (!rows.length) return <p className={styles.empty}>No traffic recorded in this period.</p>;
  return <div className={styles.breakdown}>{rows.map((row) => <div key={row.name}>
    <span><strong>{row.name}</strong><small>{integer(row.visitors)} · {percent(row.visitors, total)}</small></span>
    <i><b style={{ width: percent(row.visitors, Math.max(1, rows[0].visitors)) }} /></i>
  </div>)}</div>;
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string | string[] }> }) {
  const user = await authenticatedUser();
  if (!user) redirect("/login?next=/analytics");
  if (!isAnalyticsAdmin(user)) notFound();

  const days = analyticsRange((await searchParams).days);
  const data = await loadAnalyticsDashboard(days);
  const returnRate = percent(data.totals.returningVisitors, data.totals.visitors);
  const viewsPerSession = data.totals.sessions ? (data.totals.pageViews / data.totals.sessions).toFixed(1) : "0.0";
  const maxPageViews = Math.max(1, ...data.pages.map((page) => page.views));
  const funnel = [
    { label: "All visitors", value: data.funnel.visited },
    { label: "Saw landing page", value: data.funnel.viewedLanding },
    { label: "Saw sign in", value: data.funnel.viewedLogin },
    { label: "Opened journal", value: data.funnel.openedJournal },
  ];

  return <main className={styles.page}>
    <header className={styles.header}>
      <div className={styles.brand}><span className="brand-mark brand-mark--small" aria-hidden="true" /><span><strong>IRON PATH</strong><small>PRIVATE ANALYTICS</small></span></div>
      <Link href="/journal"><ArrowLeft size={14} /> Back to journal</Link>
    </header>

    <div className={styles.content}>
      <section className={styles.intro}>
        <div><small>OWNER&apos;S LEDGER</small><h1>How the path is being used.</h1><p>Audience, engagement, product activity, and member health in one private view.</p></div>
        <div className={styles.range} aria-label="Analytics date range">{([7, 30, 90] as const).map((range) => <Link className={days === range ? styles.active : ""} href={`/analytics?days=${range}`} key={range}>{range} days</Link>)}</div>
      </section>

      <section className={styles.metrics}>
        <article><span><Users size={17} /></span><small>UNIQUE VISITORS</small><strong>{integer(data.totals.visitors)}</strong><p>{returnRate} returned in this period</p></article>
        <article><span><Eye size={17} /></span><small>PAGE VIEWS</small><strong>{integer(data.totals.pageViews)}</strong><p>{viewsPerSession} views per session</p></article>
        <article><span><Activity size={17} /></span><small>ACTIVE MEMBERS</small><strong>{integer(data.totals.activeMembers)}</strong><p>{integer(data.totals.pluginActiveMembers)} active in RuneLite</p></article>
        <article><span><UserPlus size={17} /></span><small>TOTAL MEMBERS</small><strong>{integer(data.totals.members)}</strong><p>+{integer(data.totals.newMembers)} in the last {days} days</p></article>
      </section>

      <section className={`${styles.panel} ${styles.traffic}`}>
        <header><div><small>AUDIENCE OVER TIME</small><h2>Traffic</h2></div><div className={styles.legend}><span><i /> Page views</span><span><i /> Visitors</span></div></header>
        <LineChart rows={data.daily} />
        <footer><span><b>{integer(data.totals.sessions)}</b> sessions</span><span><b>{integer(data.totals.actions)}</b> meaningful actions</span><span><b>{returnRate}</b> return rate</span></footer>
      </section>

      <div className={styles.twoColumns}>
        <section className={styles.panel}>
          <header><div><small>CONTENT</small><h2>Popular pages</h2></div><Route size={18} /></header>
          {data.pages.length ? <div className={styles.pages}>{data.pages.map((page) => <div key={page.path}>
            <span><strong>{page.path}</strong><small>{integer(page.visitors)} visitors</small></span><b>{integer(page.views)}</b><i><em style={{ width: percent(page.views, maxPageViews) }} /></i>
          </div>)}</div> : <p className={styles.empty}>No page views recorded in this period.</p>}
        </section>

        <section className={styles.panel}>
          <header><div><small>BEHAVIOUR</small><h2>Product activity</h2></div><MousePointerClick size={18} /></header>
          {data.events.length ? <div className={styles.events}>{data.events.map((event) => <div key={event.name}><span><strong>{eventLabels[event.name] ?? event.name}</strong><small>{integer(event.visitors)} people</small></span><b>{integer(event.count)}</b></div>)}</div> : <p className={styles.empty}>Actions will appear as people use goals, showcases, and linking.</p>}
        </section>
      </div>

      <div className={styles.threeColumns}>
        <section className={styles.panel}><header><div><small>ACQUISITION</small><h2>Sources</h2></div><BookOpen size={18} /></header><Breakdown rows={data.sources} total={data.totals.visitors} /></section>
        <section className={styles.panel}><header><div><small>TECHNOLOGY</small><h2>Devices</h2></div><Smartphone size={18} /></header><Breakdown rows={data.devices} total={data.totals.visitors} /></section>
        <section className={styles.panel}>
          <header><div><small>JOURNEY</small><h2>Visit funnel</h2></div><BarChart3 size={18} /></header>
          <div className={styles.funnel}>{funnel.map((step) => <div key={step.label} style={{ width: percent(step.value, Math.max(1, data.funnel.visited)) }}><span>{step.label}</span><b>{integer(step.value)}</b></div>)}</div>
        </section>
      </div>

      <section className={`${styles.panel} ${styles.members}`}>
        <header><div><small>MEMBERS</small><h2>Who is using Iron Path</h2></div><Users size={18} /></header>
        {data.users.length ? <div className={styles.tableWrap}><table>
          <thead><tr><th>Member</th><th>Characters</th><th>Web activity</th><th>RuneLite sync</th><th>Joined</th></tr></thead>
          <tbody>{data.users.map((member) => <tr key={member.id}>
            <td><strong>{member.email}</strong><small>{member.lastActiveAt ? `Last seen ${dateTime(member.lastActiveAt)}` : `Last sign-in ${dateTime(member.lastSignInAt)}`}</small></td>
            <td><strong>{member.characterNames.join(", ") || "No character"}</strong><small>{member.characterCount} linked</small></td>
            <td><strong>{member.sessions} sessions</strong><small>{member.pageViews} views · {member.actions} actions</small></td>
            <td><strong>{dateTime(member.lastSyncedAt)}</strong><small>{member.lastSyncedAt ? "Latest character sync" : "Not connected"}</small></td>
            <td><strong>{date(member.createdAt)}</strong><small>Account created</small></td>
          </tr>)}</tbody>
        </table></div> : <p className={styles.empty}>No member activity in this period.</p>}
      </section>

      <footer className={styles.privacy}><ShieldCheck size={15} /><span><strong>Private, first-party analytics.</strong> Only allowlisted owner emails can read this page. No IP addresses, full URLs, search terms, or user-agent strings are stored.</span><small><RefreshCw size={11} /> Updated {dateTime(data.generatedAt)}</small></footer>
    </div>
  </main>;
}

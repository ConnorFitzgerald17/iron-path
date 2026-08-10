import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { accountTypeLabel } from "@/lib/character-display";
import { loadPublicProfile } from "@/lib/server/public-profile";
import { visibleShowcaseSkills } from "@/lib/skill-showcase";

export const showcaseImageSize = { width: 1200, height: 630 };

const logoData = readFile(join(process.cwd(), "public/brand/iron-path-og-mark.png"))
  .then((data) => `data:image/png;base64,${data.toString("base64")}`);

export async function renderShowcaseImage(slug: string) {
  const [profile, logo] = await Promise.all([loadPublicProfile(slug), logoData]);
  const obtained = profile?.collectionLogTotals.obtainedCount ?? 0;
  const total = profile?.collectionLogTotals.totalCount ?? 0;
  const pinned = profile?.collectionLog.reduce((sum, section) => sum + section.slots.filter((slot) => slot.public && slot.obtained).length, 0) ?? 0;
  const goals = profile?.goals.slice(0, 3) ?? [];
  const showcasedSkills = profile ? visibleShowcaseSkills(profile.skills, profile.skillShowcase).slice(0, 4) : [];
  const collectionValue = total > 0 ? `${obtained}/${total}` : `${pinned}`;
  const collectionLabel = total > 0 ? "COLLECTION LOG" : "PINNED ITEMS";

  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
      padding: "48px 58px", color: "#e8dfc7", backgroundColor: "#0d0f0e",
      backgroundImage: "radial-gradient(circle at 88% 0%, rgba(213,173,85,.17), transparent 36%), linear-gradient(145deg, #171a18 0%, #0d0f0e 68%)",
      fontFamily: "Georgia, serif",
    }}>
      <div style={{ position: "absolute", inset: 18, display: "flex", border: "1px solid #3b3b31" }} />
      <div style={{ position: "absolute", inset: 25, display: "flex", border: "1px solid #242922" }} />

      <div style={{ height: 92, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={72} height={72} style={{ objectFit: "contain", marginRight: 20 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#f2ce73", fontSize: 27, fontWeight: 700, letterSpacing: 5 }}>IRON PATH</div>
            <div style={{ marginTop: 7, color: "#8f968b", fontSize: 14, letterSpacing: 4 }}>PUBLIC FIELD JOURNAL</div>
          </div>
        </div>
        <div style={{ padding: "11px 18px", display: "flex", color: "#d5ad55", border: "1px solid #665534", backgroundColor: "#211f18", fontSize: 17, letterSpacing: 2 }}>
          {profile ? accountTypeLabel(profile.accountType, profile.lastSyncedAt).toUpperCase() : "PRIVATE PATH"}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "stretch", paddingTop: 32 }}>
        <div style={{ width: 650, display: "flex", flexDirection: "column", justifyContent: "center", paddingRight: 46 }}>
          <div style={{ color: "#9d8250", fontSize: 17, letterSpacing: 4 }}>THE ROAD REMEMBERS</div>
          <div style={{ marginTop: 14, color: "#f0e6cf", fontSize: profile ? 68 : 59, lineHeight: 1.02, fontWeight: 700, letterSpacing: -2 }}>
            {profile?.name ?? "This path is private"}
          </div>
          <div style={{ marginTop: 17, display: "flex", color: "#a3a69d", fontSize: 25 }}>
            {profile ? `Combat ${profile.combatLevel}  ·  Total level ${profile.totalLevel}` : "Only public journals can be shared."}
          </div>
        </div>

        <div style={{ width: 390, minHeight: 250, display: "flex", flexDirection: "column", padding: "24px 26px", border: "1px solid #373c35", backgroundColor: "#151816" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#9d8250", fontSize: 14, letterSpacing: 3 }}>
            <span>{goals.length ? "ON THE PATH" : "FEATURED STATS"}</span><span>{goals.length ? `${profile?.goals.length ?? 0} SHARED` : `${showcasedSkills.length} SHOWN`}</span>
          </div>
          <div style={{ height: 1, margin: "16px 0 7px", display: "flex", backgroundColor: "#30362f" }} />
          {goals.length ? goals.map((goal, index) => (
            <div key={goal.id} style={{ minHeight: 59, display: "flex", alignItems: "center", borderBottom: index < goals.length - 1 ? "1px solid #292e29" : "none" }}>
              <div style={{ width: 28, height: 28, marginRight: 13, display: "flex", alignItems: "center", justifyContent: "center", color: "#161816", backgroundColor: "#d5ad55", fontSize: 14, fontWeight: 700 }}>
                {index + 1}
              </div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#d9d1bd", fontSize: 20, whiteSpace: "nowrap", overflow: "hidden" }}>{goal.title}</div>
                <div style={{ marginTop: 4, color: "#727a71", fontSize: 12, letterSpacing: 2 }}>{goal.kind.replace("_", " ").toUpperCase()}</div>
              </div>
            </div>
          )) : showcasedSkills.map((skill, index) => (
            <div key={skill.skill} style={{ minHeight: 47, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: index < showcasedSkills.length - 1 ? "1px solid #292e29" : "none" }}>
              <div style={{ color: "#d9d1bd", fontSize: 19 }}>{skill.skill}</div>
              <div style={{ color: "#f2ce73", fontSize: 23, fontWeight: 700 }}>{skill.level}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 104, display: "flex", alignItems: "stretch", borderTop: "1px solid #3a3e37" }}>
        <div style={{ width: 258, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ color: "#f2ce73", fontSize: 35, fontWeight: 700 }}>{profile?.goals.length ?? 0}</div>
          <div style={{ marginTop: 5, color: "#777f76", fontSize: 13, letterSpacing: 2 }}>SHOWCASED PATHS</div>
        </div>
        <div style={{ width: 258, display: "flex", flexDirection: "column", justifyContent: "center", borderLeft: "1px solid #30352f", paddingLeft: 34 }}>
          <div style={{ color: "#a3cc85", fontSize: 35, fontWeight: 700 }}>{profile ? collectionValue : "—"}</div>
          <div style={{ marginTop: 5, color: "#777f76", fontSize: 13, letterSpacing: 2 }}>{collectionLabel}</div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#706f64", fontSize: 16, letterSpacing: 2 }}>
          OLD SCHOOL PROGRESS, PROPERLY TRACKED
        </div>
      </div>
    </div>,
    { ...showcaseImageSize },
  );
}

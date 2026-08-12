import { ImageResponse } from "next/og";
import { loadPublicAchievement } from "@/lib/server/achievements";

export const alt = "Iron Path achievement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

export default async function AchievementImage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const achievement = await loadPublicAchievement(publicId);
  return new ImageResponse(<div style={{
    width: "100%", height: "100%", position: "relative", overflow: "hidden", padding: "58px 68px", display: "flex", flexDirection: "column",
    color: "#e8dfc7", backgroundColor: "#0d0f0e", backgroundImage: "radial-gradient(circle at 75% 25%, rgba(213,173,85,.19), transparent 38%), linear-gradient(145deg, #171a18, #0d0f0e)", fontFamily: "Georgia, serif",
  }}>
    <div style={{ position: "absolute", inset: 20, display: "flex", border: "1px solid #4f432d" }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ color: "#f2ce73", fontSize: 27, fontWeight: 700, letterSpacing: 6 }}>IRON PATH</div>
      <div style={{ padding: "10px 17px", display: "flex", color: "#d5ad55", border: "1px solid #665534", fontSize: 15, letterSpacing: 3 }}>ACHIEVEMENT</div>
    </div>
    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
      {achievement?.itemIcon && <div style={{ width: 180, height: 180, marginRight: 48, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #51462f", background: "#1a1d19" }}>
        <img src={achievement.itemIcon} alt="" width={128} height={128} style={{ imageRendering: "pixelated" }} />
      </div>}
      <div style={{ display: "flex", flexDirection: "column", maxWidth: achievement?.itemIcon ? 780 : 1000 }}>
        <div style={{ color: "#9d8250", fontSize: 17, letterSpacing: 4 }}>{achievement?.type === "collection_unlock" ? "COLLECTION LOG UNLOCK" : "PATH COMPLETED"}</div>
        <div style={{ marginTop: 18, color: "#f0e6cf", fontSize: 64, lineHeight: 1.05, fontWeight: 700 }}>{achievement?.title ?? "Achievement unavailable"}</div>
        <div style={{ marginTop: 18, color: "#989f96", fontSize: 25 }}>{achievement?.detail ?? "This achievement could not be found."}</div>
      </div>
    </div>
    <div style={{ height: 84, display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #353a34" }}>
      <div style={{ display: "flex", flexDirection: "column" }}><span style={{ color: "#f2ce73", fontSize: 27 }}>{achievement?.characterName ?? "Iron Path"}</span><span style={{ marginTop: 5, color: "#727a71", fontSize: 14, letterSpacing: 2 }}>{achievement ? `${achievement.accountType.toUpperCase()} · TOTAL ${achievement.totalLevel}` : "THE ROAD REMEMBERS"}</span></div>
      <div style={{ color: "#706f64", fontSize: 15, letterSpacing: 2 }}>RUNE-LITE VERIFIED PROGRESS</div>
    </div>
  </div>, size);
}

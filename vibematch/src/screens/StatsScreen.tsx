import type { Card, SwipeRecord } from "../types";
import { F } from "../lib";
import { useAppStore, ALL_ACHIEVEMENTS } from "../store";
import { CAT_META } from "../data";
import { t } from "../i18n";

function Stat({ label, value, color = "#A78BFA" }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "18px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: F }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.55)", marginTop: 2, fontFamily: F }}>{label}</div>
    </div>
  );
}

// Colors/labels come from CAT_META keyed by the locale-independent cat slug

export function StatsScreen({ history, saved, onBack }: { history: SwipeRecord[]; saved: Card[]; onBack: () => void }) {
  const { streak, totalDays, achievements } = useAppStore();

  const total = history.length;
  const liked = history.filter((h) => h.dir === "right").length;
  const nope = history.filter((h) => h.dir === "left").length;

  const catCounts: Record<string, number> = {};
  history.filter((h) => h.dir === "right").forEach((h) => {
    catCounts[h.card.cat] = (catCounts[h.card.cat] || 0) + 1;
  });
  const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] || 1;

  const unlockedIds = new Set(achievements.filter((a) => a.unlockedAt).map((a) => a.id));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button aria-label={t("common.back")} className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>{t("stats.title")}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Streak banner */}
        <div style={{ background: "linear-gradient(135deg,rgba(245,158,11,.15),rgba(239,68,68,.1))", border: "1px solid rgba(245,158,11,.25)", borderRadius: 18, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 36 }}>{streak >= 7 ? "⚡" : streak >= 3 ? "🔥" : "✨"}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#FCD34D", fontFamily: F }}>{t("stats.streak", { n: streak, word: streak === 1 ? t("stats.day.one") : streak < 5 ? t("stats.day.few") : t("stats.day.many") })}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{t("stats.totalDays", { n: totalDays })}</div>
          </div>
        </div>

        {total === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.45 }}>
            <div style={{ fontSize: 44 }}>📊</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,.5)", fontFamily: F }}>{t("stats.noData")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>{t("stats.noDataHint")}</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10 }}>
              <Stat label={t("stats.total")} value={total} color="#A78BFA" />
              <Stat label={t("stats.liked")} value={liked} color="#22C55E" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Stat label={t("stats.skipped")} value={nope} color="#EF4444" />
              <Stat label={t("stats.saved")} value={saved.length} color="#FCD34D" />
            </div>

            <div style={{ background: "rgba(124,58,237,.09)", border: "1px solid rgba(124,58,237,.18)", borderRadius: 18, padding: "18px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.65)", fontFamily: F }}>{t("stats.likeRate")}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#A78BFA", fontFamily: F }}>{Math.round((liked / total) * 100)}%</span>
              </div>
              <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 99, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7C3AED,#A78BFA)", width: `${Math.round((liked / total) * 100)}%`, transition: "width 1s ease" }} />
              </div>
            </div>

            {catEntries.length > 0 && (
              <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, padding: "18px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 14, fontFamily: F }}>{t("stats.byCat")}</div>
                {catEntries.map(([cat, count]) => (
                  <div key={cat} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontFamily: F }}>{CAT_META[cat]?.label ?? cat}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: CAT_META[cat]?.color || "#A78BFA", fontFamily: F }}>{count}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,.07)", borderRadius: 99, height: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, background: CAT_META[cat]?.color || "#7C3AED", width: `${(count / maxCat) * 100}%`, transition: "width 1s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Achievements */}
        <div style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, padding: "18px 16px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 14, fontFamily: F }}>{t("stats.achievements")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ALL_ACHIEVEMENTS.map((ach) => {
              const unlocked = unlockedIds.has(ach.id);
              return (
                <div key={ach.id} style={{ display: "flex", alignItems: "center", gap: 12, opacity: unlocked ? 1 : 0.35 }}>
                  <div style={{ fontSize: 24, width: 36, textAlign: "center", filter: unlocked ? "none" : "grayscale(1)" }}>{ach.emoji}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: unlocked ? "#fff" : "rgba(255,255,255,.5)", fontFamily: F }}>{ach.title}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{ach.desc}</div>
                  </div>
                  {unlocked && <div style={{ marginLeft: "auto", fontSize: 10, color: "#22C55E", fontWeight: 700 }}>✓</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import type { Card } from "../types";
import { getStaticCards } from "../data";
import { F } from "../lib";
import { rankCards } from "../lib/scoring";
import { useAppStore } from "../store";

const LOADING_STEPS = [
  "Анализирую твои предпочтения...",
  "Смотрю на погоду и время...",
  "Учитываю историю свайпов...",
  "Выбираю лучшее для тебя...",
];

export function SurpriseModal({
  onClose,
  onMatch,
  allCards,
}: {
  onClose: () => void;
  onMatch: (c: Card) => void;
  allCards?: Card[];
}) {
  const [step, setStep] = useState(0);
  const [pick, setPick] = useState<Card | null>(null);

  const { context, swipeHistory, saved } = useAppStore();

  const cards = allCards?.length ? allCards : getStaticCards();

  useEffect(() => {
    // Animate through loading steps, then resolve
    const timers: ReturnType<typeof setTimeout>[] = [];
    LOADING_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setStep(i), i * 600));
    });

    timers.push(
      setTimeout(() => {
        // Use scoring engine: rank all unseen cards by context/weather/history
        const savedIds = new Set(saved.map((s) => s.id));
        const swipedIds = new Set(swipeHistory.map((h) => h.card.id));
        const unseen = cards.filter((c) => !savedIds.has(c.id) && !swipedIds.has(c.id));
        const pool = unseen.length > 0 ? unseen : cards;

        // Default weather for scoring when no weather data available
        const weather = { id: "any", emoji: "🌤", label: "любая", temp: 0, desc: "" };
        const ranked = rankCards(pool, context, weather, swipeHistory);

        // Pick from the top 3 to keep some surprise
        const topN = ranked.slice(0, Math.min(3, ranked.length));
        setPick(topN[Math.floor(Math.random() * topN.length)]);
      }, LOADING_STEPS.length * 600 + 200)
    );

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reasonLabels: string[] = [];
  if (pick) {
    if (pick.genres.some((g) => context.genres?.includes(g))) reasonLabels.push("твои интересы");
    if (context.mood) {
      const moodMatch =
        (context.mood === "active" && pick.genres.some((g) => ["спорт", "активный отдых"].includes(g))) ||
        (context.mood === "lazy" && (pick.cat === "film" || pick.cat === "book")) ||
        (context.mood === "social" && pick.genres.some((g) => ["бары", "квесты"].includes(g))) ||
        (context.mood === "calm" && pick.genres.some((g) => ["кофе", "уют"].includes(g)));
      if (moodMatch) reasonLabels.push("твоё настроение");
    }
    const h = new Date().getHours();
    const isEvening = h >= 18 && h < 23;
    if (isEvening && pick.genres.some((g) => ["бары", "кино", "еда", "музыка"].includes(g))) reasonLabels.push("вечернее время");
    const learned = swipeHistory.filter((s) => s.dir === "right" && s.card.genres.some((g) => pick.genres.includes(g)));
    if (learned.length > 0) reasonLabels.push("историю свайпов");
  }

  return (
    <div
      className="fade-in"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,.82)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: 24,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className={pick ? "pop-in" : ""}
        style={{
          background: "linear-gradient(160deg,#161622,#0f0f1a)",
          border: "1px solid rgba(124,58,237,.25)",
          borderRadius: 28,
          padding: 28,
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 30px 80px rgba(0,0,0,.7), inset 0 0 0 1px rgba(124,58,237,.1)",
        }}
      >
        {!pick ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 16, animation: "splashPulse 1.2s ease-in-out infinite" }}>✨</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: F, marginBottom: 8 }}>Решаю за тебя</div>
            <div
              key={step}
              className="fade-in"
              style={{ fontSize: 13, color: "rgba(255,255,255,.45)", fontFamily: F, minHeight: 20 }}
            >
              {LOADING_STEPS[step]}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
              {LOADING_STEPS.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 99,
                    background: i <= step ? "#7C3AED" : "rgba(255,255,255,.15)",
                    transition: "background .3s",
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#A78BFA", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>
                Решено за тебя
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", fontFamily: F }}>
                Выбрано специально на основе{" "}
                {reasonLabels.length > 0 ? reasonLabels.join(", ") : "твоего профиля"}
              </div>
            </div>

            <div
              style={{
                background: `linear-gradient(135deg,${pick.bg},#111)`,
                border: "1px solid rgba(255,255,255,.09)",
                borderRadius: 20,
                padding: 20,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: pick.color,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1.4,
                  marginBottom: 12,
                }}
              >
                {pick.emoji} {pick.catLabel}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontFamily: F, marginBottom: 8, lineHeight: 1.25 }}>
                {pick.title}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", lineHeight: 1.7 }}>{pick.desc}</div>
              {pick.tag && (
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    padding: "4px 10px",
                    background: "rgba(255,255,255,.07)",
                    borderRadius: 99,
                    fontSize: 11,
                    color: "rgba(255,255,255,.4)",
                  }}
                >
                  {pick.tag}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className="action-btn"
                onClick={() => { onMatch(pick); onClose(); }}
                style={{
                  flex: 2,
                  padding: 14,
                  background: `linear-gradient(135deg,${pick.color},#7C3AED)`,
                  border: "none",
                  borderRadius: 14,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: F,
                }}
              >
                Отлично! →
              </button>
              <button
                className="action-btn"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: 14,
                  background: "rgba(255,255,255,.07)",
                  border: "1px solid rgba(255,255,255,.1)",
                  borderRadius: 14,
                  color: "rgba(255,255,255,.5)",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: F,
                }}
              >
                Нет
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

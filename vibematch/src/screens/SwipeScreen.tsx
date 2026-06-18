import { useState, useRef, useCallback } from "react";
import type { Card, Geo, SwipeDir, SwipeRecord, UserContext, Weather } from "../types";
import { ALL_CARDS, MOODS } from "../data";
import { F, fetchAiTip } from "../lib";
import { Glow, Tag } from "../components/ui";

interface Props {
  context: UserContext;
  weather: Weather;
  geo: Geo | null;
  onMatch: (c: Card) => void;
  onSaved: (c: Card) => void;
  savedCount: number;
  swipeHistory: SwipeRecord[];
  onSwipeHistory: (h: SwipeRecord[]) => void;
  setTab: (t: string) => void;
  onSurprise: () => void;
}

export function SwipeScreen({
  context,
  weather,
  geo,
  onMatch,
  onSaved,
  savedCount,
  swipeHistory,
  onSwipeHistory,
  setTab,
  onSurprise,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [exit, setExit] = useState<SwipeDir | null>(null);
  const [aiLoading, setAiL] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [deckDone, setDeckDone] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Score-based filtering: prefer matching cards, fallback to all cards if < 4 remain
  const scored = ALL_CARDS.map((c) => {
    let score = 0;
    if (c.weather.includes("any") || c.weather.includes(weather.id)) score += 2;
    if (context.genres?.length && c.genres.some((g) => context.genres.includes(g))) score += 3;
    return { c, score };
  })
    .sort((a, b) => b.score - a.score);

  const filtered = scored.filter((x) => x.score > 0).map((x) => x.c);
  const cards = filtered.length >= 4 ? filtered : ALL_CARDS;

  const card = deckDone ? null : cards[idx];
  const nextC = cards[(idx + 1) % cards.length];

  const triggerAI = useCallback(
    async (hist: SwipeRecord[]) => {
      if (hist.length < 3 || hist.length % 3 !== 0) return;
      setAiL(true);
      const tip = await fetchAiTip(hist, context, weather.label);
      if (tip) setAiTip(tip);
      setAiL(false);
    },
    [context, weather]
  );

  const swipe = (dir: SwipeDir) => {
    if (!card || exit) return;
    setExit(dir);
    const nh = [...swipeHistory, { dir, card }];
    onSwipeHistory(nh);
    if (dir === "right") onMatch(card);
    if (dir === "up") onSaved(card);
    triggerAI(nh);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= cards.length) {
        setDeckDone(true);
      } else {
        setIdx(next);
      }
      setOff({ x: 0, y: 0 });
      setExit(null);
    }, 290);
  };

  const undo = () => {
    if (idx === 0 || exit) return;
    if (deckDone) {
      setDeckDone(false);
      setIdx(cards.length - 1);
    } else {
      setIdx((i) => i - 1);
    }
    onSwipeHistory(swipeHistory.slice(0, -1));
  };

  const restartDeck = () => {
    setDeckDone(false);
    setIdx(0);
  };

  // Touch handlers
  const onTS = (e: React.TouchEvent) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setDrag(true);
  };
  const onTM = (e: React.TouchEvent) => {
    if (!startRef.current) return;
    setOff({ x: e.touches[0].clientX - startRef.current.x, y: e.touches[0].clientY - startRef.current.y });
  };
  const onTE = () => {
    setDrag(false);
    if (Math.abs(off.x) > 80) swipe(off.x > 0 ? "right" : "left");
    else if (off.y < -80) swipe("up");
    else setOff({ x: 0, y: 0 });
    startRef.current = null;
  };

  // Mouse drag handlers
  const onMS = (e: React.MouseEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag(true);
  };
  const onMM = (e: React.MouseEvent) => {
    if (!startRef.current || !drag) return;
    setOff({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };
  const onMU = () => {
    if (!startRef.current) return;
    setDrag(false);
    if (Math.abs(off.x) > 80) swipe(off.x > 0 ? "right" : "left");
    else if (off.y < -80) swipe("up");
    else setOff({ x: 0, y: 0 });
    startRef.current = null;
  };

  const rot = off.x * 0.07;
  const likeOp = Math.min(1, off.x / 55);
  const nopeOp = Math.min(1, -off.x / 55);
  const saveOp = Math.min(1, -off.y / 55);
  const flyX = exit === "right" ? 500 : exit === "left" ? -500 : 0;
  const flyY = exit === "up" ? -500 : 0;
  const moodLabel = MOODS.find((m) => m.id === context.mood)?.label;

  const wBg = weather.id === "sun" ? "rgba(245,158,11,.14)" : weather.id === "rain" ? "rgba(14,165,233,.14)" : "rgba(255,255,255,.07)";
  const wBorder = weather.id === "sun" ? "rgba(245,158,11,.28)" : weather.id === "rain" ? "rgba(14,165,233,.28)" : "rgba(255,255,255,.1)";
  const wText = weather.id === "sun" ? "#FCD34D" : weather.id === "rain" ? "#7DD3FC" : "rgba(255,255,255,.5)";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      {/* Header */}
      <div style={{ padding: "48px 18px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: F }}>Для тебя</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 2 }}>
            {moodLabel} · {context.people} · {context.time}
            {geo?.city ? " · " + geo.city : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <div style={{ background: wBg, border: `1px solid ${wBorder}`, borderRadius: 99, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 14 }}>{weather.emoji}</span>
            <span style={{ fontSize: 11, color: wText, fontWeight: 600 }}>{weather.temp}°</span>
          </div>
          {(aiLoading || aiTip) && (
            <div style={{ background: "rgba(124,58,237,.12)", border: "1px solid rgba(124,58,237,.25)", borderRadius: 99, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
              {aiLoading ? (
                <>
                  <span style={{ fontSize: 11, color: "#A78BFA" }}>AI</span>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", border: "2px solid #7C3AED", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
                </>
              ) : (
                <span style={{ fontSize: 11, color: "#A78BFA", animation: "aiPulse 1.2s ease-in-out infinite" }}>✦ AI</span>
              )}
            </div>
          )}
          <button
            className="action-btn"
            onClick={() => setTab("saved")}
            style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, padding: "5px 11px", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,.55)", fontFamily: F }}
          >
            🔖 {savedCount}
          </button>
        </div>
      </div>

      {weather.id === "rain" && (
        <div className="fade-in" style={{ margin: "0 18px 8px", background: "rgba(14,165,233,.09)", border: "1px solid rgba(14,165,233,.18)", borderRadius: 12, padding: "8px 14px", fontSize: 12, color: "#7DD3FC" }}>
          🌧 {weather.desc} — показываем домашние варианты
        </div>
      )}

      {aiTip && !aiLoading && (
        <div className="fade-up" style={{ margin: "0 18px 8px", background: "rgba(124,58,237,.09)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 12, padding: "9px 14px", fontSize: 12, color: "#C4B5FD", lineHeight: 1.55 }}>
          ✦ {aiTip}
        </div>
      )}

      {/* Stack or deck-done state */}
      <div style={{ flex: 1, position: "relative", margin: "0 16px 6px" }}>
        {deckDone ? (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
          }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", textAlign: "center" }}>Всё просмотрено!</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", textAlign: "center", lineHeight: 1.6, maxWidth: 240 }}>
              Ты просмотрел все карточки. Посмотри сохранённое или начни заново.
            </div>
            <button
              onClick={restartDeck}
              style={{ marginTop: 8, padding: "12px 28px", background: "rgba(124,58,237,.2)", border: "1px solid rgba(124,58,237,.4)", borderRadius: 14, color: "#A78BFA", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F }}
            >
              Начать заново
            </button>
            <button
              onClick={() => setTab("saved")}
              style={{ padding: "12px 28px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 14, color: "rgba(255,255,255,.6)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: F }}
            >
              Сохранённые 🔖
            </button>
          </div>
        ) : card ? (
          <>
            <div style={{ position: "absolute", inset: "12px 14px 0", background: nextC.bg, borderRadius: 26, transform: "scale(.93)", opacity: 0.38 }} />
            <div
              key={idx}
              className={exit ? "" : "card-in"}
              onTouchStart={onTS}
              onTouchMove={onTM}
              onTouchEnd={onTE}
              onMouseDown={onMS}
              onMouseMove={onMM}
              onMouseUp={onMU}
              onMouseLeave={onMU}
              style={{
                position: "relative",
                borderRadius: 26,
                padding: 22,
                minHeight: 420,
                background: `linear-gradient(150deg,${card.bg} 0%,#0D0D12 100%)`,
                border: "1px solid rgba(255,255,255,.07)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transform: exit
                  ? `translateX(${flyX}px) translateY(${flyY}px) rotate(${exit === "right" ? 18 : exit === "left" ? -18 : 0}deg)`
                  : `translateX(${off.x}px) translateY(${off.y}px) rotate(${rot}deg)`,
                transition: drag ? "none" : "transform .3s cubic-bezier(.34,1.4,.64,1)",
                cursor: drag ? "grabbing" : "grab",
                userSelect: "none",
                overflow: "hidden",
              }}
            >
              <Glow color={card.color} top={-70} right={-70} size={200} opacity={0.26} />
              <div style={{ position: "absolute", top: 20, left: 20, border: "2.5px solid #22C55E", borderRadius: 8, padding: "3px 11px", opacity: likeOp, transform: "rotate(-12deg)", zIndex: 10 }}>
                <span style={{ color: "#22C55E", fontWeight: 800, fontSize: 16 }}>ДА</span>
              </div>
              <div style={{ position: "absolute", top: 20, right: 20, border: "2.5px solid #EF4444", borderRadius: 8, padding: "3px 11px", opacity: nopeOp, transform: "rotate(12deg)", zIndex: 10 }}>
                <span style={{ color: "#EF4444", fontWeight: 800, fontSize: 16 }}>НЕТ</span>
              </div>
              <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", border: "2.5px solid #A78BFA", borderRadius: 8, padding: "3px 11px", opacity: saveOp, zIndex: 10 }}>
                <span style={{ color: "#A78BFA", fontWeight: 800, fontSize: 16 }}>ПОТОМ</span>
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>{card.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: 1.5 }}>{card.catLabel}</span>
                  {card.weather.includes(weather.id) && !card.weather.includes("any") && (
                    <span style={{ fontSize: 10, background: "rgba(14,165,233,.14)", color: "#7DD3FC", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>сейчас идеально</span>
                  )}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 9, fontFamily: F }}>{card.title}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.52)", lineHeight: 1.6 }}>{card.desc}</div>
              </div>
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
                  <Tag>{card.tag}</Tag>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", marginBottom: 16 }}>✦ {card.hint}</div>
                <button
                  className="action-btn"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMatch(card);
                  }}
                  style={{ width: "100%", padding: "13px 0", background: `linear-gradient(90deg,${card.color},${card.color}cc)`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F, boxShadow: `0 4px 18px ${card.color}44` }}
                >
                  {card.action} →
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* progress dots */}
      {!deckDone && (
        <div style={{ display: "flex", gap: 3, justifyContent: "center", padding: "0 0 6px" }}>
          {cards.slice(0, Math.min(cards.length, 12)).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === idx % cards.length ? 16 : 5,
                height: 5,
                borderRadius: 99,
                transition: "all .3s",
                background: i < idx % cards.length ? "#7C3AED" : i === idx % cards.length ? "#A78BFA" : "rgba(255,255,255,.1)",
              }}
            />
          ))}
        </div>
      )}

      {/* action buttons */}
      {!deckDone && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "6px 0 28px" }}>
          <button className="swipe-btn" onClick={undo} disabled={idx === 0 && !deckDone} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.15)", color: idx === 0 && !deckDone ? "rgba(255,255,255,.15)" : "#FBBF24", fontSize: 16, cursor: idx === 0 && !deckDone ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>↩</button>
          <button className="swipe-btn" onClick={() => swipe("left")} style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,.1)", border: "1.5px solid rgba(239,68,68,.25)", color: "#EF4444", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>✕</button>
          <button className="swipe-btn" onClick={onSurprise} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(245,158,11,.1)", border: "1.5px solid rgba(245,158,11,.25)", color: "#FCD34D", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>🎲</button>
          <button className="swipe-btn" onClick={() => swipe("up")} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(167,139,250,.1)", border: "1.5px solid rgba(167,139,250,.25)", color: "#A78BFA", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>🔖</button>
          <button className="swipe-btn" onClick={() => swipe("right")} style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,.1)", border: "1.5px solid rgba(34,197,94,.25)", color: "#22C55E", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>✓</button>
        </div>
      )}
    </div>
  );
}

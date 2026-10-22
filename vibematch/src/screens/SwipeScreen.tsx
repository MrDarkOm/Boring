import { useState, useRef, useCallback, useMemo } from "react";
import type { Card, Geo, SwipeDir, SwipeRecord, UserContext, Weather } from "../types";
import { MOODS } from "../data";
import { F, fetchAiTip, isOpenNow, rankCards } from "../lib";
import { Glow, Tag } from "../components/ui";

interface Props {
  deck: Card[];
  loading: boolean;
  onReload: () => void;
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
  deck,
  loading,
  onReload,
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
  const [resetAt, setResetAt] = useState(0);
  const [drag, setDrag] = useState(false);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [exit, setExit] = useState<SwipeDir | null>(null);
  const [aiLoading, setAiL] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // колода — все ещё не просмотренные карточки, отсортированные под контекст
  const round = swipeHistory.slice(Math.min(resetAt, swipeHistory.length));
  const ranked = useMemo(() => {
    const seen = new Set(round.map((h) => h.card.id));
    return rankCards(deck.filter((c) => !seen.has(c.id)), context, weather, swipeHistory);
  }, [deck, context, weather, swipeHistory, resetAt]); // eslint-disable-line react-hooks/exhaustive-deps
  const card: Card | undefined = ranked[0];
  const nextC: Card | undefined = ranked[1];
  const progress = round.length / Math.max(1, round.length + ranked.length);
  const openNow = card?.cat === "place" ? isOpenNow(card.openingHours) : null;

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
    if (dir === "right") onMatch(card);
    if (dir === "up") onSaved(card);
    triggerAI(nh);
    // историю обновляем после анимации — иначе карточка сменится до вылета
    setTimeout(() => {
      onSwipeHistory(nh);
      setOff({ x: 0, y: 0 });
      setExit(null);
    }, 290);
  };

  const canUndo = round.length > 0;
  const undo = () => {
    if (!canUndo || exit) return;
    onSwipeHistory(swipeHistory.slice(0, -1));
  };

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

      {/* Stack */}
      <div style={{ flex: 1, position: "relative", margin: "0 16px 6px" }}>
        {!card && loading && (
          <div className="fade-in" style={{ minHeight: 420, borderRadius: 26, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", border: "3px solid #7C3AED", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: F }}>Собираю подборку</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6, maxWidth: 260 }}>Ищу места рядом с тобой, свежие скидки в Steam, фильмы и книги. Обычно это занимает несколько секунд.</div>
          </div>
        )}
        {!card && !loading && (
          <div className="fade-in" style={{ minHeight: 420, borderRadius: 26, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 44 }}>🏁</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", fontFamily: F }}>Ты посмотрел всю подборку</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6, maxWidth: 270 }}>Загляни в сохранённые или обнови данные: скидки и места могли смениться. Можно и пройти колоду ещё раз.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 260 }}>
              <button className="action-btn" onClick={onReload} style={{ padding: 12, background: "#7C3AED", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: F }}>Обновить подборку</button>
              <button className="action-btn" onClick={() => setResetAt(swipeHistory.length)} style={{ padding: 12, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "rgba(255,255,255,.65)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F }}>Пройти заново</button>
              <button className="action-btn" onClick={() => setTab("saved")} style={{ padding: 10, background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 12, cursor: "pointer", fontFamily: F }}>🔖 Сохранённые ({savedCount})</button>
            </div>
          </div>
        )}
        {card && nextC && <div style={{ position: "absolute", inset: "12px 14px 0", background: nextC.bg, borderRadius: 26, transform: "scale(.93)", opacity: 0.38 }} />}
        {card && (
        <div
          key={card.id}
          className={exit ? "" : "card-in"}
          onTouchStart={onTS}
          onTouchMove={onTM}
          onTouchEnd={onTE}
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
            cursor: "grab",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          {card.image && (
            <div style={{ position: "relative", height: 160, margin: "-22px -22px 16px", background: `#000 url("${card.image}") center/${card.cat === "book" ? "contain" : "cover"} no-repeat`, pointerEvents: "none" }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg,transparent 40%,${card.bg} 100%)` }} />
            </div>
          )}
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
                <span style={{ fontSize: 10, background: "rgba(14,165,233,.14)", color: "#7DD3FC", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>под погоду</span>
              )}
              {openNow !== null && (
                <span style={{ fontSize: 10, background: openNow ? "rgba(34,197,94,.14)" : "rgba(239,68,68,.14)", color: openNow ? "#86EFAC" : "#FCA5A5", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>{openNow ? "открыто сейчас" : "сейчас закрыто"}</span>
              )}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1.2, marginBottom: 9, fontFamily: F }}>{card.title}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.52)", lineHeight: 1.6 }}>{card.desc}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
              <Tag>{card.tag}</Tag>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginBottom: 4, lineHeight: 1.5 }}>✦ {card.hint}</div>
            {card.source && <div style={{ fontSize: 10, color: "rgba(255,255,255,.18)", marginBottom: 14 }}>Источник: {card.source}</div>}
            <button
              className="action-btn"
              onTouchStart={(e) => e.stopPropagation()}
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
        )}
      </div>

      {/* progress */}
      <div style={{ margin: "0 34px 6px", height: 4, borderRadius: 99, background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.round(progress * 100)}%`, background: "linear-gradient(90deg,#7C3AED,#A78BFA)", transition: "width .3s" }} />
      </div>

      {/* buttons */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "6px 0 28px" }}>
        <button className="swipe-btn" onClick={undo} disabled={!canUndo} style={{ width: 46, height: 46, borderRadius: "50%", background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.15)", color: canUndo ? "#FBBF24" : "rgba(255,255,255,.15)", fontSize: 16, cursor: canUndo ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>↩</button>
        <button className="swipe-btn" onClick={() => swipe("left")} style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,.1)", border: "1.5px solid rgba(239,68,68,.25)", color: "#EF4444", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>✕</button>
        <button className="swipe-btn" onClick={onSurprise} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(245,158,11,.1)", border: "1.5px solid rgba(245,158,11,.25)", color: "#FCD34D", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>🎲</button>
        <button className="swipe-btn" onClick={() => swipe("up")} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(167,139,250,.1)", border: "1.5px solid rgba(167,139,250,.25)", color: "#A78BFA", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>🔖</button>
        <button className="swipe-btn" onClick={() => swipe("right")} style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,.1)", border: "1.5px solid rgba(34,197,94,.25)", color: "#22C55E", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>✓</button>
      </div>
    </div>
  );
}

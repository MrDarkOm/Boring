import { useState, useRef, useCallback, useMemo } from "react";
import type { Card, Category, Geo, SwipeDir, SwipeRecord, UserContext, Weather } from "../types";
import { MOODS, CAT_META } from "../data";
import { F, fetchAiTip } from "../lib";
import { rankCards, scoreCard } from "../lib/scoring";
import { openAction } from "../lib/actions";
import { t, type TKey } from "../i18n";
import { Glow, Tag } from "../components/ui";

interface Props {
  context: UserContext;
  weather: Weather;
  geo: Geo | null;
  allCards?: Card[];
  onMatch: (c: Card) => void;
  onSaved: (c: Card) => void;
  savedCount: number;
  swipeHistory: SwipeRecord[];
  onSwipeHistory: (h: SwipeRecord[]) => void;
  setTab: (t: string) => void;
  onSurprise: () => void;
  onEditContext: () => void;
}

type CatFilter = Category | "all";

export function SwipeScreen({
  context,
  weather,
  geo: _geo,
  allCards = [],
  onMatch,
  onSaved,
  savedCount,
  swipeHistory,
  onSwipeHistory,
  setTab,
  onSurprise,
  onEditContext,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [exit, setExit] = useState<SwipeDir | null>(null);
  const [aiLoading, setAiL] = useState(false);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [deckDone, setDeckDone] = useState(false);
  const [catFilter, setCatFilter] = useState<CatFilter>("all");
  const startRef = useRef<{ x: number; y: number } | null>(null);

  // Full scoring engine: weather + genres + time-of-day + mood + swipe-history learning
  const cards = useMemo(() => {
    const pool = catFilter === "all" ? allCards : allCards.filter((c) => c.cat === catFilter);
    return rankCards(pool, context, weather, swipeHistory);
    // Re-rank only when context/weather/filter changes (not every swipe to avoid flicker)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCards, context, weather, catFilter]);

  const card = deckDone ? null : cards[idx];
  const nextC = cards[(idx + 1) % Math.max(cards.length, 1)];

  // Match percentage from the scoring engine (normalized to feel meaningful)
  const matchPct = useMemo(() => {
    if (!card) return 0;
    const s = scoreCard(card, context, weather, swipeHistory);
    return Math.min(99, Math.max(52, Math.round(55 + s * 4.2)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, context, weather]);

  const categories = useMemo(() => {
    const present = new Set(allCards.map((c) => c.cat));
    return (Object.keys(CAT_META) as Category[]).filter((c) => present.has(c));
  }, [allCards]);

  const pickFilter = (f: CatFilter) => {
    setCatFilter(f);
    setIdx(0);
    setDeckDone(false);
    setOff({ x: 0, y: 0 });
  };

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
    const nh = [...swipeHistory, { id: crypto.randomUUID(), at: new Date().toISOString(), dir, card }];
    onSwipeHistory(nh);
    if (dir === "right") onMatch(card);
    if (dir === "up") onSaved(card);
    triggerAI(nh);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= cards.length) setDeckDone(true);
      else setIdx(next);
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

  const wBg = weather.id === "sun" ? "rgba(251,191,36,.13)" : weather.id === "rain" ? "rgba(56,189,248,.13)" : "var(--surface-2)";
  const wBorder = weather.id === "sun" ? "rgba(251,191,36,.28)" : weather.id === "rain" ? "rgba(56,189,248,.28)" : "var(--line-2)";
  const wText = weather.id === "sun" ? "#FCD34D" : weather.id === "rain" ? "#7DD3FC" : "var(--text-2)";

  const progress = cards.length ? Math.min(1, idx / cards.length) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0E0E1C 0%,#0A0A12 100%)" }}>
      {/* Header */}
      <div style={{ padding: "48px 18px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 900, color: "var(--text-1)", fontFamily: F, letterSpacing: -0.4 }}>Для тебя</div>
          <button
            onClick={onEditContext}
            className="action-btn"
            aria-label="Изменить настроение и интересы"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11.5, color: "var(--text-3)", marginTop: 3, fontFamily: F, display: "flex", alignItems: "center", gap: 4 }}
          >
            {[
              moodLabel,
              context.people && t(`people.${context.people}` as TKey),
              context.time && t(`time.${context.time}` as TKey),
            ].filter(Boolean).join(" · ") || "Настроить подборку"}
            {_geo?.city ? ` · ${_geo.city}` : ""}
            <span style={{ color: "#A78BFA", fontSize: 10 }}>✎</span>
          </button>
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
            style={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 99, padding: "5px 11px", cursor: "pointer", fontSize: 12, color: "var(--text-2)", fontFamily: F }}
          >
            🔖 {savedCount}
          </button>
        </div>
      </div>

      {/* Category filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "6px 18px 8px", overflowX: "auto", flexShrink: 0 }}>
        <button
          className="chip-btn"
          onClick={() => pickFilter("all")}
          style={{
            padding: "6px 13px", borderRadius: 99, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            background: catFilter === "all" ? "rgba(124,58,237,.25)" : "var(--surface)",
            border: `1.5px solid ${catFilter === "all" ? "#7C3AED" : "var(--line)"}`,
            color: catFilter === "all" ? "#C4B5FD" : "var(--text-3)",
          }}
        >
          Все
        </button>
        {categories.map((cat) => {
          const m = CAT_META[cat];
          const sel = catFilter === cat;
          return (
            <button
              key={cat}
              className="chip-btn"
              onClick={() => pickFilter(cat)}
              style={{
                padding: "6px 12px", borderRadius: 99, cursor: "pointer", fontFamily: F, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
                display: "flex", alignItems: "center", gap: 5,
                background: sel ? `${m.color}2e` : "var(--surface)",
                border: `1.5px solid ${sel ? m.color : "var(--line)"}`,
                color: sel ? m.color : "var(--text-3)",
              }}
            >
              <span style={{ fontSize: 13 }}>{m.emoji}</span>
              {m.label}
            </button>
          );
        })}
      </div>

      {weather.id === "rain" && (
        <div className="fade-in" style={{ margin: "0 18px 8px", background: "rgba(56,189,248,.09)", border: "1px solid rgba(56,189,248,.18)", borderRadius: 12, padding: "8px 14px", fontSize: 12, color: "#7DD3FC" }}>
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
        {deckDone || !card ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ fontSize: 48 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", textAlign: "center", fontFamily: F }}>
              {cards.length === 0 ? "В этой категории пусто" : "Всё просмотрено!"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", textAlign: "center", lineHeight: 1.6, maxWidth: 240, fontFamily: F }}>
              {cards.length === 0 ? "Попробуй другую категорию или сбрось фильтр." : "Ты просмотрел все карточки. Посмотри сохранённое или начни заново."}
            </div>
            {cards.length > 0 ? (
              <button onClick={restartDeck} className="action-btn" style={{ marginTop: 8, padding: "12px 28px", background: "rgba(124,58,237,.2)", border: "1px solid rgba(124,58,237,.4)", borderRadius: 14, color: "#A78BFA", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F }}>
                Начать заново
              </button>
            ) : (
              <button onClick={() => pickFilter("all")} className="action-btn" style={{ marginTop: 8, padding: "12px 28px", background: "rgba(124,58,237,.2)", border: "1px solid rgba(124,58,237,.4)", borderRadius: 14, color: "#A78BFA", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F }}>
                Показать все
              </button>
            )}
            <button onClick={() => setTab("saved")} className="action-btn" style={{ padding: "12px 28px", background: "var(--surface)", border: "1px solid var(--line-2)", borderRadius: 14, color: "var(--text-2)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: F }}>
              Сохранённые 🔖
            </button>
          </div>
        ) : (
          <>
            {nextC && <div style={{ position: "absolute", inset: "12px 14px 0", background: nextC.bg, borderRadius: 26, transform: "scale(.93)", opacity: 0.38, border: "1px solid rgba(255,255,255,.04)" }} />}
            <div
              key={`${catFilter}-${idx}`}
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
                height: "100%",
                background: `linear-gradient(150deg,${card.bg} 0%,#0C0C12 100%)`,
                border: "1px solid rgba(255,255,255,.08)",
                boxShadow: "0 24px 60px rgba(0,0,0,.5)",
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
              <Glow color={card.color} top={-70} right={-70} size={220} opacity={0.3} />
              <Glow color={card.color} top="70%" right="72%" size={160} opacity={0.12} />

              {/* Swipe verdict stamps */}
              <div style={{ position: "absolute", top: 20, left: 20, border: "2.5px solid #34D399", borderRadius: 8, padding: "3px 11px", opacity: likeOp, transform: "rotate(-12deg)", zIndex: 10, background: "rgba(0,0,0,.35)" }}>
                <span style={{ color: "#34D399", fontWeight: 800, fontSize: 16 }}>ДА</span>
              </div>
              <div style={{ position: "absolute", top: 20, right: 20, border: "2.5px solid #FB7185", borderRadius: 8, padding: "3px 11px", opacity: nopeOp, transform: "rotate(12deg)", zIndex: 10, background: "rgba(0,0,0,.35)" }}>
                <span style={{ color: "#FB7185", fontWeight: 800, fontSize: 16 }}>НЕТ</span>
              </div>
              <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", border: "2.5px solid #A78BFA", borderRadius: 8, padding: "3px 11px", opacity: saveOp, zIndex: 10, background: "rgba(0,0,0,.35)" }}>
                <span style={{ color: "#A78BFA", fontWeight: 800, fontSize: 16 }}>ПОТОМ</span>
              </div>

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  {/* Emoji tile */}
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: `linear-gradient(135deg,${card.color}30,${card.color}0d)`, border: `1px solid ${card.color}45`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                    {card.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: card.color, textTransform: "uppercase", letterSpacing: 1.6 }}>{card.catLabel}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {/* Match % badge */}
                      <span style={{ fontSize: 10, background: "rgba(124,58,237,.18)", border: "1px solid rgba(124,58,237,.35)", color: "#C4B5FD", borderRadius: 99, padding: "2px 8px", fontWeight: 700 }}>
                        {matchPct}% совпадение
                      </span>
                      {card.weather.includes(weather.id) && !card.weather.includes("any") && (
                        <span style={{ fontSize: 10, background: "rgba(56,189,248,.14)", color: "#7DD3FC", borderRadius: 99, padding: "2px 8px", fontWeight: 600 }}>под погоду</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 25, fontWeight: 900, color: "var(--text-1)", lineHeight: 1.18, marginBottom: 10, fontFamily: F, letterSpacing: -0.5 }}>{card.title}</div>
                <div style={{ fontSize: 13.5, color: "var(--text-2)", lineHeight: 1.65 }}>{card.desc}</div>
              </div>

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 9 }}>
                  <Tag>{card.tag}</Tag>
                  {card.genres.slice(0, 2).map((g) => (
                    <Tag key={g}>{t(`genre.${g}` as TKey)}</Tag>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 15 }}>✦ {card.hint}</div>
                <button
                  className="action-btn"
                  onTouchStart={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); openAction(card, _geo); }}
                  style={{ width: "100%", padding: "13px 0", background: `linear-gradient(90deg,${card.color},${card.color}b8)`, border: "none", borderRadius: 14, color: "#08080E", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: F, boxShadow: `0 4px 20px ${card.color}40` }}
                >
                  {card.action} →
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* progress bar */}
      {!deckDone && cards.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 24px 4px" }}>
          <div style={{ flex: 1, height: 3, borderRadius: 99, background: "rgba(255,255,255,.07)", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#7C3AED,#A78BFA)", width: `${progress * 100}%`, transition: "width .3s" }} />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: F, fontWeight: 600, flexShrink: 0 }}>{Math.min(idx + 1, cards.length)}/{cards.length}</span>
        </div>
      )}

      {/* action buttons */}
      {!deckDone && cards.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "6px 0 26px" }}>
          <button aria-label="Отменить" className="swipe-btn" onClick={undo} disabled={idx === 0 && !deckDone} style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--surface)", border: "1.5px solid var(--line-2)", color: idx === 0 && !deckDone ? "rgba(255,255,255,.15)" : "#FBBF24", fontSize: 16, cursor: idx === 0 && !deckDone ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>↩</button>
          <button aria-label="Не интересует" className="swipe-btn" onClick={() => swipe("left")} style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(251,113,133,.12)", border: "1.5px solid rgba(251,113,133,.3)", color: "#FB7185", fontSize: 21, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(251,113,133,.15)" }}>✕</button>
          <button aria-label="Случайный выбор" className="swipe-btn" onClick={onSurprise} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(251,191,36,.1)", border: "1.5px solid rgba(251,191,36,.28)", color: "#FCD34D", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🎲</button>
          <button aria-label="Сохранить на потом" className="swipe-btn" onClick={() => swipe("up")} style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(167,139,250,.1)", border: "1.5px solid rgba(167,139,250,.28)", color: "#A78BFA", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>🔖</button>
          <button aria-label="Хочу это" className="swipe-btn" onClick={() => swipe("right")} style={{ width: 58, height: 58, borderRadius: "50%", background: "rgba(52,211,153,.12)", border: "1.5px solid rgba(52,211,153,.3)", color: "#34D399", fontSize: 21, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(52,211,153,.15)" }}>✓</button>
        </div>
      )}
    </div>
  );
}

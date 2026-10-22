import { useState } from "react";
import type { Card } from "../types";
import { FALLBACK_CARDS } from "../data";
import { F, actionUrl, openLink } from "../lib";
import { Glow, Tag } from "../components/ui";

type Phase = "lobby" | "p1" | "handover" | "p2" | "result";

// Two players take turns on one device; the result is the real intersection of their "yes" answers.
export function CoopScreen({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [idx, setIdx] = useState(0);
  const [likes1, setLikes1] = useState<Card[]>([]);
  const [likes2, setLikes2] = useState<Card[]>([]);

  const card = FALLBACK_CARDS[idx];
  const player = phase === "p2" ? 2 : 1;
  const common = likes1.filter((c) => likes2.some((p) => p.id === c.id));
  const result = common[0] ?? null;

  const reset = () => {
    setIdx(0);
    setLikes1([]);
    setLikes2([]);
    setPhase("lobby");
  };

  const pick = (liked: boolean) => {
    if (liked) (player === 1 ? setLikes1 : setLikes2)((l) => [...l, card]);
    if (idx + 1 < FALLBACK_CARDS.length) return setIdx(idx + 1);
    setIdx(0);
    setPhase(player === 1 ? "handover" : "result");
  };

  if (phase === "handover")
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 18, textAlign: "center", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
        <div className="pop-in" style={{ fontSize: 54 }}>🤝</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>Первый игрок закончил</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.65, maxWidth: 290 }}>Передай телефон второму игроку. Его ответы скрыты от первого, поэтому выбирайте честно — совпадения покажем в конце.</div>
        <button className="action-btn" onClick={() => setPhase("p2")} style={{ padding: "14px 40px", background: "#7C3AED", border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, boxShadow: "0 6px 22px rgba(124,58,237,.4)" }}>Я второй игрок</button>
      </div>
    );

  if (phase === "result" && !result)
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 18, textAlign: "center", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
        <div className="pop-in" style={{ fontSize: 54 }}>🤷</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>Общих «да» не нашлось</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", lineHeight: 1.65, maxWidth: 290 }}>Вкусы в этот раз не пересеклись. Попробуйте ещё раз и отвечайте посмелее — или бросьте кубик на главном экране.</div>
        <button className="action-btn" onClick={reset} style={{ padding: "14px 40px", background: "#7C3AED", border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F }}>Сыграть заново</button>
        <button className="action-btn" onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 13, cursor: "pointer", fontFamily: F }}>← На главную</button>
      </div>
    );

  if (phase === "result" && result)
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 20, textAlign: "center", background: `linear-gradient(180deg,${result.bg} 0%,#0A0A0A 60%)` }}>
        <div className="pop-in" style={{ fontSize: 54 }}>🎯</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: result.color, textTransform: "uppercase", letterSpacing: 2.5 }}>Совпадение! Общих «да»: {common.length}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>{result.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6, maxWidth: 300 }}>{result.desc}</div>
        <Tag>{result.tag}</Tag>
        {common.length > 1 && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", lineHeight: 1.6, maxWidth: 300 }}>
            Ещё понравилось обоим: {common.slice(1).map((c) => c.title).join(", ")}
          </div>
        )}
        <button className="action-btn" onClick={() => openLink(actionUrl(result))} style={{ padding: "14px 36px", background: result.color, border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, marginTop: 8 }}>{result.action} →</button>
        <button className="action-btn" onClick={reset} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", fontSize: 13, cursor: "pointer", fontFamily: F }}>Сыграть заново</button>
        <button className="action-btn" onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 13, cursor: "pointer", fontFamily: F }}>← На главную</button>
      </div>
    );

  if (phase === "lobby")
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "50px 22px 36px", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Совместный режим</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center" }}>
          <div style={{ fontSize: 50 }}>👥</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>Найдите общий вайб</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.65, maxWidth: 290 }}>Сначала свайпает первый игрок, затем телефон переходит ко второму. В конце покажем то, что понравилось вам обоим.</div>
          <button className="action-btn" onClick={() => setPhase("p1")} style={{ padding: "14px 40px", background: "#7C3AED", border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, boxShadow: "0 6px 22px rgba(124,58,237,.4)" }}>Начать игру</button>
        </div>
      </div>
    );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 10px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: F }}>Игрок {player}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{idx}/{FALLBACK_CARDS.length}</div>
      </div>
      <div style={{ flex: 1, position: "relative", margin: "0 16px 10px" }}>
        <div className="card-in" style={{ position: "relative", borderRadius: 26, padding: 22, minHeight: 360, background: `linear-gradient(150deg,${card.bg} 0%,#0D0D12 100%)`, border: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
          <Glow color={card.color} top={-70} right={-70} size={180} opacity={0.24} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 10, color: card.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 13 }}>{card.emoji} {card.catLabel}</div>
            <div style={{ fontSize: 23, fontWeight: 800, color: "#fff", fontFamily: F, marginBottom: 7 }}>{card.title}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>{card.desc}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <Tag>{card.tag}</Tag>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, padding: "8px 24px 32px", justifyContent: "center" }}>
        <button className="swipe-btn" onClick={() => pick(false)} style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(239,68,68,.1)", border: "1.5px solid rgba(239,68,68,.28)", color: "#EF4444", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>✕</button>
        <button className="swipe-btn" onClick={() => pick(true)} style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(34,197,94,.1)", border: "1.5px solid rgba(34,197,94,.28)", color: "#22C55E", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .15s" }}>✓</button>
      </div>
    </div>
  );
}

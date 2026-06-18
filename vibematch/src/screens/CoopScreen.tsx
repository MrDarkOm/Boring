import { useState } from "react";
import type { Card } from "../types";
import { ALL_CARDS } from "../data";
import { F } from "../lib";
import { Glow, Tag } from "../components/ui";

export function CoopScreen({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<"lobby" | "swipe" | "result">("lobby");
  const [code] = useState(() => Math.random().toString(36).slice(2, 6).toUpperCase());
  const [myLikes, setMyLikes] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<Card | null>(null);

  const card = ALL_CARDS[idx % ALL_CARDS.length];

  const pick = (liked: boolean) => {
    const nl = liked ? [...myLikes, card] : myLikes;
    setMyLikes(nl);
    if (idx + 1 >= ALL_CARDS.length) {
      const partnerLikes = ALL_CARDS.filter(() => Math.random() > 0.45);
      const match = nl.find((c) => partnerLikes.find((p) => p.id === c.id));
      setTimeout(() => {
        setResult(match || nl[0] || ALL_CARDS[0]);
        setPhase("result");
      }, 350);
    }
    setIdx((i) => i + 1);
  };

  if (phase === "result" && result)
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 20, textAlign: "center", background: `linear-gradient(180deg,${result.bg} 0%,#0A0A0A 60%)` }}>
        <div className="pop-in" style={{ fontSize: 54 }}>🎯</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: result.color, textTransform: "uppercase", letterSpacing: 2.5 }}>Совпадение!</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>{result.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6, maxWidth: 300 }}>{result.desc}</div>
        <Tag>{result.tag}</Tag>
        <button className="action-btn" style={{ padding: "14px 36px", background: result.color, border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, marginTop: 8 }}>{result.action} →</button>
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
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.65, maxWidth: 290 }}>Свайпайте независимо — найдём что понравилось обоим</div>
          <div style={{ background: "rgba(124,58,237,.12)", border: "2px dashed rgba(124,58,237,.35)", borderRadius: 20, padding: "22px 40px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 7, letterSpacing: 1 }}>КОД КОМНАТЫ</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#A78BFA", letterSpacing: 5, fontFamily: F }}>{code}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 6 }}>Поделись с другом</div>
          </div>
          <button className="action-btn" onClick={() => setPhase("swipe")} style={{ padding: "14px 40px", background: "#7C3AED", border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, boxShadow: "0 6px 22px rgba(124,58,237,.4)" }}>Начать</button>
        </div>
      </div>
    );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 10px", display: "flex", justifyContent: "space-between" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: F }}>Твои свайпы</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{idx}/{ALL_CARDS.length}</div>
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

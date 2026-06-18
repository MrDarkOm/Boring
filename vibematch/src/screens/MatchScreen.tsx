import { useState, useEffect } from "react";
import type { Card } from "../types";
import { F } from "../lib";
import { Tag } from "../components/ui";

export function MatchScreen({ card, onBack, onSaved }: { card: Card; onBack: () => void; onSaved: (c: Card) => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 40);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: `linear-gradient(180deg,${card.bg} 0%,#0A0A0A 55%)` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", overflow: "hidden" }}>
        {shown &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${12 + i * 11}%`,
                top: "28%",
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: ["#7C3AED", "#22C55E", "#EF4444", "#F59E0B", "#0EA5E9"][i % 5],
                animation: `confetti ${0.75 + i * 0.14}s ease-out ${i * 0.07}s forwards`,
              }}
            />
          ))}
      </div>
      <div style={{ padding: "50px 22px 0", position: "relative" }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 15px", cursor: "pointer", fontSize: 13, fontFamily: F }}>
          ← Назад
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 24px", gap: 18, position: "relative" }} className="fade-up">
        <div style={{ textAlign: "center" }}>
          <div className="pop-in" style={{ fontSize: 50, marginBottom: 5 }}>✨</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: card.color, textTransform: "uppercase", letterSpacing: 2.5 }}>Матч!</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 22, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 13 }}>
            <span style={{ fontSize: 28 }}>{card.emoji}</span>
            <span style={{ fontSize: 10, color: card.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 }}>{card.catLabel}</span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: "#fff", marginBottom: 8, fontFamily: F }}>{card.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.65, marginBottom: 12 }}>{card.desc}</div>
          <Tag>{card.tag}</Tag>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button className="action-btn" style={{ padding: 14, background: card.color, border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, boxShadow: `0 5px 22px ${card.color}50` }}>
            {card.action} →
          </button>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="action-btn" onClick={() => { onSaved(card); onBack(); }} style={{ flex: 1, padding: 12, background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.22)", borderRadius: 14, color: "#A78BFA", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F }}>
              🔖 Сохранить
            </button>
            <button className="action-btn" style={{ flex: 1, padding: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, color: "rgba(255,255,255,.5)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F }}>
              👥 Поделиться
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import type { Card } from "../types";
import { ALL_CARDS } from "../data";
import { F } from "../lib";

export function SurpriseModal({ onClose, onMatch }: { onClose: () => void; onMatch: (c: Card) => void }) {
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<Card | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setPick(ALL_CARDS[Math.floor(Math.random() * ALL_CARDS.length)]);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fade-in" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.78)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24, backdropFilter: "blur(10px)" }}>
      <div className={loading ? "" : "pop-in"} style={{ background: "#161622", border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, padding: 28, width: "100%", maxWidth: 340 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 14, animation: "splashPulse 1s ease-in-out infinite" }}>🎲</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: F }}>Бросаю кубик...</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginTop: 6 }}>ищу что-то неожиданное</div>
          </div>
        ) : (
          pick && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 42, marginBottom: 8 }}>🎲</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#FCD34D", textTransform: "uppercase", letterSpacing: 2 }}>Удивляю!</div>
              </div>
              <div style={{ background: `linear-gradient(135deg,${pick.bg},#111)`, border: "1px solid rgba(255,255,255,.09)", borderRadius: 20, padding: 18, marginBottom: 18 }}>
                <div style={{ fontSize: 11, color: pick.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10 }}>{pick.emoji} {pick.catLabel}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F, marginBottom: 7 }}>{pick.title}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>{pick.desc}</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="action-btn" onClick={() => { onMatch(pick); onClose(); }} style={{ flex: 2, padding: 13, background: pick.color, border: "none", borderRadius: 13, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F }}>Попробую!</button>
                <button className="action-btn" onClick={onClose} style={{ flex: 1, padding: 13, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 13, color: "rgba(255,255,255,.5)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: F }}>Нет</button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}

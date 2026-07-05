import { useState, useEffect } from "react";
import type { Card, Geo } from "../types";
import { F } from "../lib";
import { openAction, shareCard } from "../lib/actions";
import { Tag } from "../components/ui";
import { t } from "../i18n";

export function MatchScreen({ card, onBack, onSaved, geo = null }: { card: Card; onBack: () => void; onSaved: (c: Card) => void; geo?: Geo | null }) {
  const [shown, setShown] = useState(false);
  const [shareState, setShareState] = useState<string | null>(null);
  const [savedNow, setSavedNow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 40);
    return () => clearTimeout(t);
  }, []);

  const handleShare = async () => {
    const res = await shareCard(card, geo);
    if (res === "copied") setShareState(t("match.copied"));
    else if (res === "failed") setShareState(t("match.shareFailed"));
    if (res !== "shared") setTimeout(() => setShareState(null), 2200);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: `linear-gradient(180deg,${card.bg} 0%,#0A0A0A 55%)` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", overflow: "hidden" }}>
        {shown &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${6 + i * 8}%`,
                top: "28%",
                width: i % 3 === 0 ? 9 : 6,
                height: i % 3 === 0 ? 9 : 6,
                borderRadius: i % 2 === 0 ? "50%" : 2,
                background: ["#A78BFA", "#34D399", "#FB7185", "#FBBF24", "#38BDF8"][i % 5],
                animation: `confetti ${0.75 + i * 0.11}s ease-out ${i * 0.06}s forwards`,
              }}
            />
          ))}
      </div>
      <div style={{ padding: "50px 22px 0", position: "relative" }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 15px", cursor: "pointer", fontSize: 13, fontFamily: F }}>
          {t("match.back")}
        </button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 24px", gap: 18, position: "relative" }} className="fade-up">
        <div style={{ textAlign: "center" }}>
          <div className="pop-in" style={{ fontSize: 50, marginBottom: 5 }}>✨</div>
          <div style={{ fontSize: 11, fontWeight: 800, color: card.color, textTransform: "uppercase", letterSpacing: 3 }}>{t("match.title")}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 22, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: `linear-gradient(135deg,${card.color}30,${card.color}0d)`, border: `1px solid ${card.color}45`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
              {card.emoji}
            </div>
            <span style={{ fontSize: 10, color: card.color, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5 }}>{card.catLabel}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 8, fontFamily: F, letterSpacing: -0.4 }}>{card.title}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.65, marginBottom: 12 }}>{card.desc}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            <Tag>{card.tag}</Tag>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          <button
            className="action-btn"
            onClick={() => openAction(card, geo)}
            style={{ padding: 15, background: `linear-gradient(90deg,${card.color},${card.color}c4)`, border: "none", borderRadius: 15, color: "#08080E", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: F, boxShadow: `0 6px 26px ${card.color}4d` }}
          >
            {card.action} →
          </button>
          <div style={{ display: "flex", gap: 9 }}>
            <button
              className="action-btn"
              onClick={() => { onSaved(card); setSavedNow(true); setTimeout(onBack, 550); }}
              style={{ flex: 1, padding: 12, background: savedNow ? "rgba(52,211,153,.15)" : "rgba(167,139,250,.1)", border: `1px solid ${savedNow ? "rgba(52,211,153,.35)" : "rgba(167,139,250,.22)"}`, borderRadius: 14, color: savedNow ? "#34D399" : "#A78BFA", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F }}
            >
              {savedNow ? t("match.saved") : t("match.save")}
            </button>
            <button
              className="action-btn"
              onClick={handleShare}
              style={{ flex: 1, padding: 12, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, color: "rgba(255,255,255,.55)", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: F }}
            >
              {shareState ?? t("match.share")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

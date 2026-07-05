import { useState } from "react";
import type { Card } from "../types";
import { F } from "../lib";
import { useAppStore, type Collection } from "../store";
import { t } from "../i18n";

const EMOJIS = ["📂", "🌟", "❤️", "🎬", "☕", "🏃", "📚", "🎮", "🌙", "🔥", "💡", "🎯"];

interface Props {
  saved: Card[];
  onBack: () => void;
  onOpen: (c: Card) => void;
}

export function CollectionsScreen({ saved, onBack, onOpen }: Props) {
  const { collections, addCollection, removeCollection, removeFromCollection } = useAppStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📂");
  const [openColl, setOpenColl] = useState<Collection | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    addCollection(newName.trim(), newEmoji);
    setNewName("");
    setNewEmoji("📂");
    setCreating(false);
  };

  // ── Detail view ──────────────────────────────────────────────────────────
  if (openColl) {
    const coll = collections.find((c) => c.id === openColl.id) ?? openColl;
    const collCards = saved.filter((c) => coll.cardIds.includes(c.id));
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
        <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <button aria-label={t("common.back")} className="action-btn" onClick={() => setOpenColl(null)} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
          <div style={{ fontSize: 20 }}>{coll.emoji}</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: F }}>{coll.name}</div>
          <button
            aria-label={t("coll.aria.delete")}
            className="action-btn"
            onClick={() => { removeCollection(coll.id); setOpenColl(null); }}
            style={{ marginLeft: "auto", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 99, color: "#EF4444", padding: "7px 12px", cursor: "pointer", fontSize: 12, fontFamily: F }}
          >
            {t("common.delete")}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
          {collCards.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.45 }}>
              <div style={{ fontSize: 40 }}>{coll.emoji}</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,.5)", fontFamily: F }}>{t("coll.emptyColl")}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)", textAlign: "center" }}>{t("coll.emptyCollHint")}</div>
            </div>
          ) : (
            collCards.map((card) => (
              <div key={card.id} style={{ background: `linear-gradient(135deg,${card.bg},#111)`, border: "1px solid rgba(255,255,255,.08)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>{card.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)" }}>{card.catLabel}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="action-btn" onClick={() => onOpen(card)} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "#fff", padding: "6px 10px", cursor: "pointer", fontSize: 12, fontFamily: F }}>→</button>
                  <button aria-label={t("coll.aria.removeCard")} className="action-btn" onClick={() => removeFromCollection(coll.id, card.id)} style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.18)", borderRadius: 8, color: "#EF4444", padding: "6px 10px", cursor: "pointer", fontSize: 12 }}>✕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── List of collections ──────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button aria-label={t("common.back")} className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>{t("coll.title")}</div>
        <button
          className="action-btn"
          onClick={() => setCreating(true)}
          style={{ marginLeft: "auto", background: "rgba(124,58,237,.2)", border: "1px solid rgba(124,58,237,.35)", borderRadius: 99, color: "#A78BFA", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}
        >
          {t("coll.new")}
        </button>
      </div>

      {creating && (
        <div className="fade-in" style={{ margin: "0 16px 12px", background: "rgba(124,58,237,.1)", border: "1px solid rgba(124,58,237,.25)", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", marginBottom: 10 }}>{t("coll.pickIcon")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setNewEmoji(e)} style={{ width: 36, height: 36, borderRadius: 10, background: newEmoji === e ? "rgba(124,58,237,.4)" : "rgba(255,255,255,.07)", border: `1.5px solid ${newEmoji === e ? "rgba(124,58,237,.7)" : "transparent"}`, cursor: "pointer", fontSize: 18 }}>{e}</button>
            ))}
          </div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder={t("coll.namePlaceholder")}
            style={{ width: "100%", padding: "11px 14px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12, color: "#fff", fontSize: 14, fontFamily: F, outline: "none", marginBottom: 10, boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} style={{ flex: 1, padding: "11px 0", background: "#7C3AED", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: F }}>{t("common.create")}</button>
            <button onClick={() => setCreating(false)} style={{ padding: "11px 16px", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, color: "rgba(255,255,255,.5)", fontSize: 14, cursor: "pointer", fontFamily: F }}>{t("common.cancel")}</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        {collections.length === 0 && !creating ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.45 }}>
            <div style={{ fontSize: 44 }}>📂</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,.5)", fontFamily: F }}>{t("coll.empty")}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>{t("coll.emptyHint")}</div>
          </div>
        ) : (
          collections.map((coll) => {
            const count = coll.cardIds.length;
            return (
              <button
                key={coll.id}
                className="action-btn"
                onClick={() => setOpenColl(coll)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, cursor: "pointer", textAlign: "left" }}
              >
                <div style={{ fontSize: 28 }}>{coll.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: F }}>{coll.name}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{count} {count === 1 ? t("coll.cards.one") : count < 5 ? t("coll.cards.few") : t("coll.cards.many")}</div>
                </div>
                <span style={{ fontSize: 18, color: "rgba(255,255,255,.25)" }}>›</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { Card } from "../types";
import { F } from "../lib";
import { useAppStore } from "../store";
import { CollectionsScreen } from "./CollectionsScreen";

interface Props {
  saved: Card[];
  onBack: () => void;
  onOpen: (c: Card) => void;
  comments: Record<number, string>;
  onComment: (id: number, txt: string) => void;
}

export function SavedScreen({ saved, onBack, onOpen, comments, onComment }: Props) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [view, setView] = useState<"saved" | "collections">("saved");
  const [addingToCard, setAddingToCard] = useState<number | null>(null);

  const { collections, addToCollection, removeSaved } = useAppStore();

  if (view === "collections") {
    return <CollectionsScreen saved={saved} onBack={() => setView("saved")} onOpen={onOpen} />;
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button aria-label="Назад" className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Сохранённые</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="action-btn"
            onClick={() => setView("collections")}
            style={{ background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 99, color: "#A78BFA", padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: F }}
          >
            📂 Коллекции
          </button>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>{saved.length} шт</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        {saved.length === 0 ? (
          <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.45 }}>
            <div style={{ fontSize: 44 }}>🔖</div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,.5)", fontFamily: F }}>Пока пусто</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)", textAlign: "center" }}>Свайпай вверх чтобы сохранить</div>
          </div>
        ) : (
          saved.map((c, i) => (
            <div key={c.id} className="fade-up" style={{ animationDelay: `${i * 0.05}s`, background: `linear-gradient(120deg,${c.bg} 0%,#111 100%)`, border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "16px 16px 12px", display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => onOpen(c)}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{c.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: c.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 }}>{c.catLabel}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: F, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.32)", marginTop: 2 }}>{c.tag}</div>
                </div>
                <div style={{ color: c.color, fontSize: 16, flexShrink: 0 }}>→</div>
              </div>

              {/* Collection picker */}
              {addingToCard === c.id && collections.length > 0 && (
                <div className="fade-in" style={{ padding: "0 14px 12px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {collections.map((coll) => (
                    <button
                      key={coll.id}
                      onClick={() => { addToCollection(coll.id, c.id); setAddingToCard(null); }}
                      style={{ padding: "5px 10px", background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 99, color: "#A78BFA", fontSize: 11, cursor: "pointer", fontFamily: F }}
                    >
                      {coll.emoji} {coll.name}
                    </button>
                  ))}
                  <button onClick={() => setAddingToCard(null)} style={{ padding: "5px 10px", background: "none", border: "none", color: "rgba(255,255,255,.25)", fontSize: 11, cursor: "pointer", fontFamily: F }}>✕</button>
                </div>
              )}

              <div style={{ padding: "0 14px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                {editing === c.id ? (
                  <div style={{ flex: 1, display: "flex", gap: 8 }}>
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Добавить заметку..."
                      style={{ flex: 1, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 12, fontFamily: F, outline: "none" }}
                    />
                    <button className="action-btn" onClick={() => { onComment(c.id, draft); setEditing(null); setDraft(""); }} style={{ padding: "8px 12px", background: "#7C3AED", border: "none", borderRadius: 10, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: F, fontWeight: 600 }}>OK</button>
                  </div>
                ) : (
                  <div style={{ flex: 1 }}>
                    {comments[c.id] ? (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontStyle: "italic", cursor: "pointer" }} onClick={() => { setDraft(comments[c.id]); setEditing(c.id); }}>
                        💬 {comments[c.id]}
                      </div>
                    ) : (
                      <button onClick={() => setEditing(c.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.2)", fontSize: 11, cursor: "pointer", fontFamily: F, padding: 0 }}>+ заметка</button>
                    )}
                  </div>
                )}

                {/* Quick actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  {collections.length > 0 && (
                    <button
                      aria-label="Добавить в коллекцию"
                      className="action-btn"
                      onClick={() => setAddingToCard(addingToCard === c.id ? null : c.id)}
                      style={{ padding: "5px 8px", background: "rgba(124,58,237,.1)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 8, color: "#A78BFA", fontSize: 13, cursor: "pointer" }}
                    >
                      📂
                    </button>
                  )}
                  <button
                    aria-label="Удалить из сохранённых"
                    className="action-btn"
                    onClick={() => removeSaved(c.id)}
                    style={{ padding: "5px 8px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.15)", borderRadius: 8, color: "#EF4444", fontSize: 13, cursor: "pointer" }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

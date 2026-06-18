import { useState } from "react";
import type { Card } from "../types";
import { F } from "../lib";

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

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Сохранённые</div>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,.28)" }}>{saved.length} шт</div>
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
              {editing === c.id ? (
                <div style={{ padding: "0 14px 14px", display: "flex", gap: 8 }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Добавить заметку..."
                    style={{ flex: 1, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 12, fontFamily: F, outline: "none" }}
                  />
                  <button className="action-btn" onClick={() => { onComment(c.id, draft); setEditing(null); setDraft(""); }} style={{ padding: "8px 12px", background: "#7C3AED", border: "none", borderRadius: 10, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: F, fontWeight: 600 }}>OK</button>
                </div>
              ) : (
                <div style={{ padding: "0 14px 12px" }}>
                  {comments[c.id] ? (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontStyle: "italic", cursor: "pointer" }} onClick={() => { setDraft(comments[c.id]); setEditing(c.id); }}>
                      💬 {comments[c.id]}
                    </div>
                  ) : (
                    <button onClick={() => setEditing(c.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,.2)", fontSize: 11, cursor: "pointer", fontFamily: F, padding: 0 }}>+ заметка</button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

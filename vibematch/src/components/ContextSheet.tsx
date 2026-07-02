import { useState } from "react";
import type { UserContext } from "../types";
import { MOODS, PEOPLE, TIMES, ALL_GENRES } from "../data";
import { F } from "../lib";

interface Props {
  context: UserContext;
  onSave: (ctx: UserContext) => void;
  onClose: () => void;
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      className="chip-btn"
      onClick={onClick}
      style={{
        padding: "8px 13px", borderRadius: 11, cursor: "pointer", fontFamily: F,
        background: selected ? "rgba(124,58,237,.22)" : "var(--surface)",
        border: `1.5px solid ${selected ? "#7C3AED" : "var(--line)"}`,
        color: selected ? "#C4B5FD" : "var(--text-2)",
        fontWeight: 600, fontSize: 12.5,
      }}
    >
      {label}
    </button>
  );
}

export function ContextSheet({ context, onSave, onClose }: Props) {
  const [vals, setVals] = useState<UserContext>(context);

  return (
    <div
      className="fade-in"
      onClick={onClose}
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.65)", zIndex: 60, display: "flex", flexDirection: "column", justifyContent: "flex-end", backdropFilter: "blur(6px)" }}
    >
      <div
        className="sheet-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg,#16162A,#0E0E1A)",
          borderRadius: "26px 26px 0 0",
          border: "1px solid var(--line-2)",
          borderBottom: "none",
          padding: "14px 20px 26px",
          maxHeight: "82%",
          overflowY: "auto",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: "rgba(255,255,255,.18)", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-1)", fontFamily: F, marginBottom: 16 }}>Настроить подборку</div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>Вайб</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
          {MOODS.map((m) => (
            <button
              key={m.id}
              className="chip-btn"
              onClick={() => setVals((v) => ({ ...v, mood: m.id }))}
              style={{
                display: "flex", alignItems: "center", gap: 9, padding: "11px 13px", borderRadius: 14, cursor: "pointer", fontFamily: F,
                background: vals.mood === m.id ? "rgba(124,58,237,.22)" : "var(--surface)",
                border: `1.5px solid ${vals.mood === m.id ? "#7C3AED" : "var(--line)"}`,
              }}
            >
              <span style={{ fontSize: 20 }}>{m.emoji}</span>
              <span style={{ color: vals.mood === m.id ? "#C4B5FD" : "var(--text-2)", fontWeight: 700, fontSize: 13 }}>{m.label}</span>
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>Сколько вас</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {PEOPLE.map((p) => (
            <Chip key={p} label={p} selected={vals.people === p} onClick={() => setVals((v) => ({ ...v, people: p }))} />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>Сколько времени</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {TIMES.map((t) => (
            <Chip key={t} label={t} selected={vals.time === t} onClick={() => setVals((v) => ({ ...v, time: t }))} />
          ))}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 8 }}>
          Интересы {vals.genres.length > 0 && <span style={{ color: "#A78BFA" }}>· {vals.genres.length}</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 22 }}>
          {ALL_GENRES.map((g) => {
            const sel = vals.genres.includes(g);
            return (
              <Chip
                key={g}
                label={g}
                selected={sel}
                onClick={() => setVals((v) => ({ ...v, genres: sel ? v.genres.filter((x) => x !== g) : [...v.genres, g] }))}
              />
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="action-btn cta-grad"
            onClick={() => { onSave(vals); onClose(); }}
            style={{
              flex: 1, padding: "14px 0", border: "none", borderRadius: 14, cursor: "pointer", fontFamily: F,
              background: "linear-gradient(120deg,#7C3AED,#A855F7,#7C3AED)",
              color: "#fff", fontWeight: 800, fontSize: 15,
              boxShadow: "0 6px 24px rgba(124,58,237,.4)",
            }}
          >
            Показать подборку
          </button>
          <button
            className="action-btn"
            onClick={onClose}
            style={{ padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 14, color: "var(--text-3)", fontSize: 14, cursor: "pointer", fontFamily: F }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

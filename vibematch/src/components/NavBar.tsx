import { F } from "../lib";

const ITEMS = [
  { id: "swipe",    icon: "✨", label: "Для тебя" },
  { id: "map",      icon: "🗺",  label: "Рядом" },
  { id: "coop",     icon: "👥", label: "Вместе" },
  { id: "stats",    icon: "📊", label: "Стата" },
  { id: "saved",    icon: "🔖", label: "Моё" },
  { id: "settings", icon: "⚙",  label: "Ещё" },
];

interface Props {
  tab: string;
  setTab: (t: string) => void;
  streak?: number;
}

export function NavBar({ tab, setTab, streak = 0 }: Props) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(9,9,17,.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderTop: "1px solid rgba(255,255,255,.07)",
        paddingBottom: 6,
        paddingTop: 2,
      }}
    >
      {ITEMS.map((it) => (
        <button
          key={it.id}
          aria-label={it.label}
          aria-current={tab === it.id ? "page" : undefined}
          className="tab-btn"
          onClick={() => setTab(it.id)}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "8px 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: tab === it.id ? "#A78BFA" : "rgba(255,255,255,.28)",
            transition: "color .2s",
            fontFamily: F,
            position: "relative",
          }}
        >
          <span style={{ fontSize: 18 }}>{it.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 600 }}>{it.label}</span>
          {/* Streak badge on stats tab */}
          {it.id === "stats" && streak > 0 && (
            <div style={{ position: "absolute", top: 4, right: "calc(50% - 14px)", background: "#EF4444", borderRadius: 99, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#fff", padding: "0 3px" }}>
              {streak >= 7 ? "⚡" : "🔥"}
            </div>
          )}
          {tab === it.id && (
            <div style={{ position: "absolute", bottom: -2, width: 20, height: 2, borderRadius: 99, background: "#7C3AED" }} />
          )}
        </button>
      ))}
    </div>
  );
}

import { F } from "../lib";

const ITEMS = [
  { id: "swipe", icon: "✨", label: "Для тебя" },
  { id: "map", icon: "🗺", label: "Карта" },
  { id: "coop", icon: "👥", label: "Вместе" },
  { id: "stats", icon: "📊", label: "Стата" },
  { id: "saved", icon: "🔖", label: "Saved" },
  { id: "settings", icon: "⚙", label: "Ещё" },
];

export function NavBar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(10,10,18,.97)",
        borderTop: "1px solid rgba(255,255,255,.06)",
        paddingBottom: 6,
        paddingTop: 2,
      }}
    >
      {ITEMS.map((it) => (
        <button
          key={it.id}
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
          {tab === it.id && (
            <div style={{ position: "absolute", bottom: -2, width: 20, height: 2, borderRadius: 99, background: "#7C3AED" }} />
          )}
        </button>
      ))}
    </div>
  );
}

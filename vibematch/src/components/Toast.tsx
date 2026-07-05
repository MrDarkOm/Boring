import { useEffect } from "react";
import { F } from "../lib";
import { t } from "../i18n";

export function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 100,
        background: "#1C1828",
        border: "1px solid rgba(124,58,237,.3)",
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        animation: "notifSlide .3s ease both",
        boxShadow: "0 8px 32px rgba(0,0,0,.6)",
      }}
    >
      <span style={{ fontSize: 20 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2, fontFamily: F }}>
          {t("app.name")}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontFamily: F }}>{msg}</div>
      </div>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "rgba(255,255,255,.3)", cursor: "pointer", fontSize: 15, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );
}

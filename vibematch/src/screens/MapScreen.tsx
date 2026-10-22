import { useState } from "react";
import type { Card, Geo, SourceStatus } from "../types";
import { F, haversine, fmtDist, actionUrl, openLink, isOpenNow } from "../lib";

interface Props {
  onBack: () => void;
  geo: Geo | null;
  deck: Card[];
  status: SourceStatus;
  onOpen: (c: Card) => void;
}

type MapPlace = Card & { lat: number; lng: number; distLabel: string; open: boolean | null };

export function MapScreen({ onBack, geo, deck, status, onOpen }: Props) {
  const [sel, setSel] = useState<MapPlace | null>(null);

  const userLat = geo?.lat || 55.751;
  const userLng = geo?.lng || 37.618;
  const SPAN_LAT = 0.07;
  const SPAN_LNG = 0.12;
  const minLat = userLat - SPAN_LAT;
  const maxLat = userLat + SPAN_LAT;
  const minLng = userLng - SPAN_LNG;
  const maxLng = userLng + SPAN_LNG;
  const toX = (lng: number) => Math.max(2, Math.min(98, ((lng - minLng) / (maxLng - minLng)) * 100));
  const toY = (lat: number) => Math.max(2, Math.min(96, (1 - (lat - minLat) / (maxLat - minLat)) * 100));

  const places: MapPlace[] = deck
    .filter((c): c is Card & { lat: number; lng: number } => c.cat === "place" && c.lat != null && c.lng != null)
    .map((p) => {
      const distM = haversine(userLat, userLng, p.lat, p.lng);
      return { ...p, distM, distLabel: fmtDist(distM), open: isOpenNow(p.openingHours) };
    })
    .sort((a, b) => a.distM - b.distM);
  const dotColor = (o: boolean | null) => (o === true ? "#22C55E" : o === false ? "#EF4444" : "rgba(255,255,255,.25)");
  const openLabel = (o: boolean | null) => (o === true ? "Открыто" : o === false ? "Закрыто" : "Часы не указаны");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Рядом с тобой</div>
          {geo?.city && <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2, fontFamily: F }}>📍 {geo.city}</div>}
        </div>
      </div>

      <div style={{ margin: "0 16px", borderRadius: 20, overflow: "hidden", position: "relative", background: "#0a1628", border: "1px solid rgba(255,255,255,.08)", height: 256 }}>
        <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
          {[0.2, 0.4, 0.6, 0.8].map((p) => (
            <g key={p}>
              <line x1={`${p * 100}%`} y1="0" x2={`${p * 100}%`} y2="100%" stroke="rgba(255,255,255,.04)" strokeWidth="1" />
              <line x1="0" y1={`${p * 100}%`} x2="100%" y2={`${p * 100}%`} stroke="rgba(255,255,255,.04)" strokeWidth="1" />
            </g>
          ))}
          <line x1="20%" y1="0" x2="30%" y2="100%" stroke="rgba(255,255,255,.07)" strokeWidth="2" />
          <line x1="0" y1="40%" x2="100%" y2="35%" stroke="rgba(255,255,255,.07)" strokeWidth="2" />
          <line x1="0" y1="65%" x2="100%" y2="70%" stroke="rgba(255,255,255,.07)" strokeWidth="2" />
          <line x1="55%" y1="0" x2="60%" y2="100%" stroke="rgba(255,255,255,.07)" strokeWidth="2" />
          <line x1="78%" y1="0" x2="74%" y2="100%" stroke="rgba(255,255,255,.05)" strokeWidth="1.5" />
        </svg>
        <div style={{ position: "absolute", left: `${toX(userLng)}%`, top: `${toY(userLat)}%`, transform: "translate(-50%,-50%)" }}>
          <div style={{ position: "relative" }}>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#3B82F6", border: "3px solid #fff", zIndex: 2, position: "relative" }} />
            <div className="ping" style={{ position: "absolute", top: 0, left: 0, width: 13, height: 13, borderRadius: "50%", background: "rgba(59,130,246,.35)" }} />
          </div>
        </div>
        {places.map((p) => (
          <div key={p.id} onClick={() => setSel(sel?.id === p.id ? null : p)} style={{ position: "absolute", left: `${toX(p.lng)}%`, top: `${toY(p.lat)}%`, transform: "translate(-50%,-100%)", cursor: "pointer", zIndex: 5 }}>
            <div style={{ background: p.color, borderRadius: 99, padding: "4px 9px", fontSize: 13, display: "flex", alignItems: "center", gap: 3, boxShadow: `0 2px 10px ${p.color}55`, border: sel?.id === p.id ? "2px solid #fff" : "2px solid transparent", transition: "all .2s" }}>
              <span>{p.emoji}</span>
            </div>
            <div style={{ width: 2, height: 5, background: p.color, margin: "0 auto" }} />
          </div>
        ))}
      </div>

      {sel && (
        <div className="fade-up" style={{ margin: "12px 16px 0", background: "rgba(255,255,255,.05)", border: `1px solid ${sel.color}30`, borderRadius: 18, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: F }}>{sel.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginTop: 3 }}>{sel.catLabel} · {sel.distLabel} · {openLabel(sel.open)}</div>
            </div>
            <button className="action-btn" onClick={() => openLink(actionUrl(sel))} style={{ padding: "8px 14px", background: sel.color, border: "none", borderRadius: 10, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: F, fontWeight: 600 }}>Маршрут →</button>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", lineHeight: 1.55, marginTop: 10 }}>{sel.desc}</div>
          <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
            <button className="action-btn" onClick={() => onOpen(sel)} style={{ background: "none", border: "none", padding: 0, color: "#A78BFA", fontSize: 12, cursor: "pointer", fontFamily: F }}>Подробнее</button>
            {sel.site && <button className="action-btn" onClick={() => openLink(sel.site!)} style={{ background: "none", border: "none", padding: 0, color: "rgba(255,255,255,.45)", fontSize: 12, cursor: "pointer", fontFamily: F }}>Сайт заведения ↗</button>}
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {places.length === 0 && (
          <div style={{ textAlign: "center", padding: "28px 12px", color: "rgba(255,255,255,.4)", fontSize: 13, lineHeight: 1.6, fontFamily: F }}>
            {status.state === "loading"
              ? "Ищу места рядом в OpenStreetMap…"
              : !geo
                ? "Разреши доступ к геолокации, чтобы увидеть реальные места рядом с тобой."
                : `Не удалось загрузить места: ${status.reason || "OpenStreetMap не ответил"}. Попробуй обновить позже.`}
          </div>
        )}
        {places.map((p) => (
          <div key={p.id} className="action-btn" onClick={() => setSel(sel?.id === p.id ? null : p)} style={{ display: "flex", gap: 12, alignItems: "center", background: sel?.id === p.id ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)", border: `1px solid ${sel?.id === p.id ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)"}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", transition: "all .2s" }}>
            <span style={{ fontSize: 22 }}>{p.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: F }}>{p.title}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{p.catLabel} · {p.distLabel} · {openLabel(p.open)}</div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(p.open) }} />
          </div>
        ))}
      </div>
    </div>
  );
}

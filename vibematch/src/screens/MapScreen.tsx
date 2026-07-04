import { useState, useEffect } from "react";
import type { Geo, Place } from "../types";
import { F } from "../lib";
import { fetchNearby } from "../lib/places";
import { openUrl } from "../lib/actions";
import { routeUrl } from "../lib/mapLinks";

export function MapScreen({ onBack, geo }: { onBack: () => void; geo: Geo | null }) {
  const [sel, setSel] = useState<Place | null>(null);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!geo) return;
    setLoading(true);
    fetchNearby(geo)
      .then((r) => { setPlaces(r.places); setFailed(r.places.length === 0); })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [geo?.lat, geo?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const userLat = geo?.lat ?? 0;
  const userLng = geo?.lng ?? 0;

  // Real data only — no demo fallback
  const list: Place[] = places ?? [];
  const isDemo = !places?.length;

  // Fit map bounds around actual points
  const lats = [userLat, ...list.map((p) => p.lat)];
  const lngs = [userLng, ...list.map((p) => p.lng)];
  const pad = 0.004;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const toX = (lng: number) => Math.max(3, Math.min(97, ((lng - minLng) / (maxLng - minLng || 1)) * 100));
  const toY = (lat: number) => Math.max(4, Math.min(94, (1 - (lat - minLat) / (maxLat - minLat || 1)) * 100));

  const openRoute = (p: Place) =>
    openUrl(routeUrl({ lat: userLat, lng: userLng }, { lat: p.lat, lng: p.lng }));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0E0E1C 0%,#0A0A12 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Рядом с тобой</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2, fontFamily: F }}>
            {geo?.city ? `📍 ${geo.city}` : geo ? "📍 по координатам" : "📍 геолокация недоступна"}
            {places?.length ? ` · ${places.length} мест из OpenStreetMap` : ""}
          </div>
        </div>
      </div>

      {isDemo && !loading && (
        <div className="fade-in" style={{ margin: "0 16px 10px", background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 12, padding: "9px 14px", fontSize: 12, color: "#FCD34D", fontFamily: F, lineHeight: 1.5 }}>
          {failed
            ? "⚠️ Не удалось загрузить места поблизости. Проверь интернет и попробуй ещё раз."
            : geo
              ? "⏳ Ищем настоящие места рядом..."
              : "⚠️ Разреши геолокацию (или зайди по HTTPS), чтобы видеть реальные места рядом."}
        </div>
      )}

      <div style={{ margin: "0 16px", borderRadius: 20, overflow: "hidden", position: "relative", background: "#0a1628", border: "1px solid rgba(255,255,255,.08)", height: 250, flexShrink: 0 }}>
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
        </svg>

        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", border: "3px solid rgba(124,58,237,.3)", borderTopColor: "#7C3AED", animation: "spin .9s linear infinite" }} />
          </div>
        )}

        {geo && (
          <div style={{ position: "absolute", left: `${toX(userLng)}%`, top: `${toY(userLat)}%`, transform: "translate(-50%,-50%)", zIndex: 6 }}>
            <div style={{ position: "relative" }}>
              <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#3B82F6", border: "3px solid #fff", zIndex: 2, position: "relative" }} />
              <div className="ping" style={{ position: "absolute", top: 0, left: 0, width: 13, height: 13, borderRadius: "50%", background: "rgba(59,130,246,.35)" }} />
            </div>
          </div>
        )}
        {!loading && list.slice(0, 14).map((p) => (
          <div key={p.id} onClick={() => setSel(sel?.id === p.id ? null : p)} style={{ position: "absolute", left: `${toX(p.lng)}%`, top: `${toY(p.lat)}%`, transform: "translate(-50%,-100%)", cursor: "pointer", zIndex: 5 }}>
            <div style={{ background: p.color, borderRadius: 99, padding: "4px 9px", fontSize: 13, display: "flex", alignItems: "center", gap: 3, boxShadow: `0 2px 10px ${p.color}55`, border: sel?.id === p.id ? "2px solid #fff" : "2px solid transparent", transition: "all .2s" }}>
              <span>{p.cat}</span>
            </div>
            <div style={{ width: 2, height: 5, background: p.color, margin: "0 auto" }} />
          </div>
        ))}
      </div>

      {sel && (
        <div className="fade-up" style={{ margin: "12px 16px 0", background: "rgba(255,255,255,.05)", border: `1px solid ${sel.color}30`, borderRadius: 18, padding: 16, flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel.name}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.38)", marginTop: 3 }}>
                {sel.distLabel ?? sel.dist}{sel.rating ? ` · ⭐ ${sel.rating}` : ""}
              </div>
            </div>
            <button
              className="action-btn"
              aria-label="Построить маршрут"
              onClick={() => openRoute(sel)}
              style={{ padding: "9px 14px", background: sel.color, border: "none", borderRadius: 10, color: "#08080E", fontSize: 12, cursor: "pointer", fontFamily: F, fontWeight: 700, flexShrink: 0 }}
            >
              Маршрут →
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
        {list.map((p) => (
          <div key={p.id} className="action-btn" onClick={() => setSel(sel?.id === p.id ? null : p)} style={{ display: "flex", gap: 12, alignItems: "center", background: sel?.id === p.id ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)", border: `1px solid ${sel?.id === p.id ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.06)"}`, borderRadius: 14, padding: "12px 14px", cursor: "pointer", transition: "all .2s" }}>
            <span style={{ fontSize: 22 }}>{p.cat}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: F, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 2 }}>
                {p.distLabel ?? p.dist}{p.rating ? ` · ⭐ ${p.rating}` : ""}
              </div>
            </div>
            <button
              className="action-btn"
              aria-label={`Маршрут до ${p.name}`}
              onClick={(e) => { e.stopPropagation(); openRoute(p); }}
              style={{ padding: "6px 10px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 9, color: "rgba(255,255,255,.6)", fontSize: 12, cursor: "pointer", flexShrink: 0 }}
            >
              →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

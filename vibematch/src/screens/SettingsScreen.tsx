import { useState } from "react";
import type { GeoState, Notifs, Profile, Weather } from "../types";
import { WEATHERS } from "../data";
import { F } from "../lib";
import type { ReactNode } from "react";

interface Props {
  profile: Profile;
  onProfile: (p: Profile) => void;
  weather: Weather;
  onWeather: (w: Weather) => void;
  notifs: Notifs;
  onNotifs: (n: Notifs) => void;
  onBack: () => void;
  onReset: () => void;
  geoState: GeoState;
}

function Row({ label, children, border = true }: { label: string; children: ReactNode; border?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderBottom: border ? "1px solid rgba(255,255,255,.06)" : "none" }}>
      <span style={{ fontSize: 14, color: "rgba(255,255,255,.65)", fontFamily: F }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle} style={{ width: 44, height: 24, borderRadius: 99, cursor: "pointer", transition: "background .25s", background: on ? "#7C3AED" : "rgba(255,255,255,.12)", position: "relative" }}>
      <div style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .25s", boxShadow: "0 1px 4px rgba(0,0,0,.3)" }} />
    </div>
  );
}

export function SettingsScreen({ profile, onProfile, weather, onWeather, notifs, onNotifs, onBack, onReset, geoState }: Props) {
  const [name, setName] = useState(profile.name);
  const [editName, setEditName] = useState(false);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
      <div style={{ padding: "50px 20px 14px", display: "flex", alignItems: "center", gap: 12 }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Настройки</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 32px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: F }}>Профиль</div>
        <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "20px 18px", display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#7C3AED,#0EA5E9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{profile.avatar}</div>
          <div style={{ flex: 1 }}>
            {editName ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: "7px 10px", color: "#fff", fontSize: 14, fontFamily: F, outline: "none" }} />
                <button className="action-btn" onClick={() => { onProfile({ ...profile, name }); setEditName(false); }} style={{ padding: "7px 12px", background: "#7C3AED", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, cursor: "pointer", fontFamily: F }}>OK</button>
              </div>
            ) : (
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: F, cursor: "pointer" }} onClick={() => setEditName(true)}>
                {profile.name} <span style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>✎</span>
              </div>
            )}
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 3, fontFamily: F }}>вайбматчер</div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: F }}>Погода</div>
        <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "16px 18px", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginBottom: 4, fontFamily: F }}>Влияет на подборку карточек</div>
          {geoState === "ok" && <div style={{ fontSize: 11, color: "#22C55E", marginBottom: 12, fontFamily: F }}>✓ Определено по геолокации · {weather.temp}°C</div>}
          {geoState === "approx" && <div style={{ fontSize: 11, color: "#38BDF8", marginBottom: 12, fontFamily: F }}>≈ Примерно по IP · {weather.temp}°C — разреши геолокацию для точности</div>}
          {geoState === "loading" && <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 12, fontFamily: F }}>Определяю местоположение...</div>}
          {(geoState === "denied" || geoState === "error") && <div style={{ fontSize: 11, color: "#F59E0B", marginBottom: 12, fontFamily: F }}>Геолокация недоступна — выберите вручную</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {WEATHERS.map((w) => (
              <button key={w.id} className="action-btn" onClick={() => onWeather(w)} style={{ flex: "1 1 30%", padding: "10px 6px", borderRadius: 12, cursor: "pointer", background: weather.id === w.id ? "rgba(124,58,237,.2)" : "rgba(255,255,255,.05)", border: `1.5px solid ${weather.id === w.id ? "#7C3AED" : "rgba(255,255,255,.1)"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, fontFamily: F }}>
                <span style={{ fontSize: 20 }}>{w.emoji}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.65)", fontWeight: 600 }}>{w.label}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{w.temp}°</span>
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: F }}>Уведомления</div>
        <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, padding: "4px 18px", marginBottom: 20 }}>
          <Row label="Вечерние подсказки"><Toggle on={notifs.evening} onToggle={() => onNotifs({ ...notifs, evening: !notifs.evening })} /></Row>
          <Row label="Скидки рядом"><Toggle on={notifs.sales} onToggle={() => onNotifs({ ...notifs, sales: !notifs.sales })} /></Row>
          <Row label="Новые места" border={false}><Toggle on={notifs.places} onToggle={() => onNotifs({ ...notifs, places: !notifs.places })} /></Row>
        </div>

        <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8, fontFamily: F }}>Сброс</div>
        <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.14)", borderRadius: 18, padding: "4px 18px" }}>
          <Row label="Сбросить историю и сохранения" border={false}>
            <button className="action-btn" onClick={onReset} style={{ padding: "7px 14px", background: "rgba(239,68,68,.14)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 10, color: "#EF4444", fontSize: 12, cursor: "pointer", fontFamily: F, fontWeight: 600 }}>Сброс</button>
          </Row>
        </div>
      </div>
    </div>
  );
}

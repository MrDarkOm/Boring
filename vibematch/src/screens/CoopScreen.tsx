import { useState, useEffect, useCallback } from "react";
import type { Card } from "../types";
import { ALL_CARDS } from "../data";
import { F } from "../lib";
import { Glow, Tag } from "../components/ui";
import { supabase } from "../api/supabase";
import { createCoopSession, joinCoopSession, getCoopSession, coopSwipe, checkCoopMatch } from "../api/coop";
import { useAuth } from "../hooks/useAuth";
import { useAppStore } from "../store";

type CoopPhase = "lobby" | "create" | "join" | "waiting" | "swipe" | "result";

export function CoopScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<CoopPhase>("lobby");
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [guestJoined, setGuestJoined] = useState(false);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<Card | null>(null);
  const [error, setError] = useState<string | null>(null);

  const card = ALL_CARDS[idx % ALL_CARDS.length];
  const isAuthed = !!user;

  // Realtime: listen for guest joining (host side)
  useEffect(() => {
    if (phase !== "waiting" || !code || !supabase) return;

    const channel = supabase!
      .channel(`coop:${code}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "coop_sessions",
        filter: `code=eq.${code}`,
      }, (payload) => {
        if (payload.new.status === "active" && payload.new.guest_id) {
          setSessionId(payload.new.id);
          setGuestJoined(true);
          setPhase("swipe");
        }
      })
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [phase, code]);

  // Realtime: listen for match events
  const listenForMatch = useCallback((sid: string, cardId: number) => {
    if (!supabase) return () => {};
    const channel = supabase
      .channel(`match:${sid}:${cardId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "coop_swipes",
        filter: `session_id=eq.${sid}`,
      }, async () => {
        const matched = await checkCoopMatch(sid, cardId);
        if (matched) {
          const matchedCard = ALL_CARDS.find((c) => c.id === cardId) ?? ALL_CARDS[0];
          setResult(matchedCard);
          setPhase("result");
          supabase!.removeChannel(channel);
        }
      })
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, []);

  const handleCreate = async () => {
    if (!isAuthed) { setError("Войдите в аккаунт для совместного режима"); return; }
    const newCode = await createCoopSession(user.id);
    if (!newCode) { setError("Не удалось создать комнату"); return; }
    useAppStore.getState().unlockAchievement("coop_first");
    setCode(newCode);
    setPhase("waiting");
  };

  const handleJoin = async () => {
    if (!isAuthed) { setError("Войдите в аккаунт для совместного режима"); return; }
    const joinedId = await joinCoopSession(joinCode.trim().toUpperCase(), user.id);
    if (!joinedId) { setError("Комната не найдена или уже занята"); return; }
    useAppStore.getState().unlockAchievement("coop_first");
    const session = await getCoopSession(joinCode.trim().toUpperCase());
    setSessionId(joinedId);
    setCode(session?.code ?? joinCode);
    setPhase("swipe");
  };

  const pick = async (liked: boolean) => {
    if (sessionId && user) {
      const dir = liked ? "right" : "left";
      await coopSwipe(sessionId, user.id, card.id, dir);
      if (liked) {
        listenForMatch(sessionId, card.id);
      }
    } else if (!isAuthed) {
      // Offline/demo mode — simulate partner
      if (liked && Math.random() > 0.55) {
        setResult(card);
        setPhase("result");
        return;
      }
    }

    const next = idx + 1;
    if (next >= ALL_CARDS.length) {
      setResult(ALL_CARDS[0]);
      setPhase("result");
    } else {
      setIdx(next);
    }
  };

  // ── Result screen ─────────────────────────────────────────────────────────
  if (phase === "result" && result) {
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 20, textAlign: "center", background: `linear-gradient(180deg,${result.bg} 0%,#0A0A0A 60%)` }}>
        <div className="pop-in" style={{ fontSize: 54 }}>🎯</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: result.color, textTransform: "uppercase", letterSpacing: 2.5 }}>Совпадение!</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>{result.title}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6, maxWidth: 300 }}>{result.desc}</div>
        <Tag>{result.tag}</Tag>
        <button className="action-btn" style={{ padding: "14px 36px", background: result.color, border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, marginTop: 8 }}>{result.action} →</button>
        <button className="action-btn" onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 13, cursor: "pointer", fontFamily: F }}>← На главную</button>
      </div>
    );
  }

  // ── Waiting for guest ─────────────────────────────────────────────────────
  if (phase === "waiting") {
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "50px 22px 36px", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)", gap: 22 }}>
        <button className="action-btn" onClick={onBack} style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>⏳</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Ждём друга...</div>
          <div style={{ background: "rgba(124,58,237,.12)", border: "2px dashed rgba(124,58,237,.35)", borderRadius: 20, padding: "22px 40px" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginBottom: 7, letterSpacing: 1 }}>КОД КОМНАТЫ</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#A78BFA", letterSpacing: 5, fontFamily: F }}>{code}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 6 }}>Поделись с другом</div>
          </div>
          {guestJoined && <div style={{ fontSize: 14, color: "#22C55E" }}>Друг подключился!</div>}
          <div style={{ width: 9, height: 9, borderRadius: "50%", border: "2px solid #7C3AED", borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        </div>
      </div>
    );
  }

  // ── Swipe phase ───────────────────────────────────────────────────────────
  if (phase === "swipe") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)" }}>
        <div style={{ padding: "50px 20px 10px", display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: F }}>Ваш вайб</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)" }}>{code && `#${code} · `}{idx + 1}/{ALL_CARDS.length}</div>
        </div>
        <div style={{ flex: 1, position: "relative", margin: "0 16px 10px" }}>
          <div className="card-in" style={{ position: "relative", borderRadius: 26, padding: 22, minHeight: 360, background: `linear-gradient(150deg,${card.bg} 0%,#0D0D12 100%)`, border: "1px solid rgba(255,255,255,.07)", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden" }}>
            <Glow color={card.color} top={-70} right={-70} size={180} opacity={0.24} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 10, color: card.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 13 }}>{card.emoji} {card.catLabel}</div>
              <div style={{ fontSize: 23, fontWeight: 800, color: "#fff", fontFamily: F, marginBottom: 7 }}>{card.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>{card.desc}</div>
            </div>
            <div style={{ position: "relative", zIndex: 1 }}><Tag>{card.tag}</Tag></div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, padding: "8px 24px 32px", justifyContent: "center" }}>
          <button className="swipe-btn" onClick={() => pick(false)} style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(239,68,68,.1)", border: "1.5px solid rgba(239,68,68,.28)", color: "#EF4444", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          <button className="swipe-btn" onClick={() => pick(true)} style={{ width: 62, height: 62, borderRadius: "50%", background: "rgba(34,197,94,.1)", border: "1.5px solid rgba(34,197,94,.28)", color: "#22C55E", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
        </div>
      </div>
    );
  }

  // ── Lobby ─────────────────────────────────────────────────────────────────
  if (phase === "create") {
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "50px 22px 36px", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)", gap: 16 }}>
        <button className="action-btn" onClick={() => setPhase("lobby")} style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🏠</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Создать комнату</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>Друг войдёт по коду — и начнёте свайпать</div>
          {error && <div style={{ fontSize: 12, color: "#EF4444" }}>{error}</div>}
          <button onClick={handleCreate} style={{ padding: "14px 40px", background: "#7C3AED", border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F }}>Создать →</button>
        </div>
      </div>
    );
  }

  if (phase === "join") {
    return (
      <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "50px 22px 36px", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)", gap: 16 }}>
        <button className="action-btn" onClick={() => setPhase("lobby")} style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" }}>
          <div style={{ fontSize: 48 }}>🔗</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Войти в комнату</div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABCD12"
            maxLength={6}
            style={{ width: 160, padding: "14px 16px", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.2)", borderRadius: 14, color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: 6, textAlign: "center", fontFamily: F, outline: "none" }}
          />
          {error && <div style={{ fontSize: 12, color: "#EF4444" }}>{error}</div>}
          <button onClick={handleJoin} disabled={joinCode.length < 4} style={{ padding: "14px 40px", background: joinCode.length >= 4 ? "#7C3AED" : "rgba(124,58,237,.3)", border: "none", borderRadius: 99, color: "#fff", fontWeight: 700, fontSize: 15, cursor: joinCode.length >= 4 ? "pointer" : "default", fontFamily: F }}>Войти →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ flex: 1, display: "flex", flexDirection: "column", padding: "50px 22px 36px", background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="action-btn" onClick={onBack} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 99, color: "rgba(255,255,255,.55)", padding: "7px 14px", cursor: "pointer", fontSize: 13, fontFamily: F }}>←</button>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", fontFamily: F }}>Совместный режим</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
        <div style={{ fontSize: 50 }}>👥</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: F }}>Найдите общий вайб</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.65, maxWidth: 290 }}>
          Свайпайте независимо — система найдёт то, что понравилось обоим
        </div>
        {!isAuthed && (
          <div style={{ fontSize: 12, color: "#FBBF24", background: "rgba(251,191,36,.08)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 10, padding: "8px 14px" }}>
            Войдите в аккаунт для онлайн-режима
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 260 }}>
          <button onClick={() => setPhase("create")} style={{ padding: "14px 0", background: "#7C3AED", border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: F, boxShadow: "0 6px 22px rgba(124,58,237,.4)" }}>
            Создать комнату
          </button>
          <button onClick={() => setPhase("join")} style={{ padding: "14px 0", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: F }}>
            Войти по коду
          </button>
          <button onClick={() => { setPhase("swipe"); }} style={{ padding: "11px 0", background: "none", border: "none", color: "rgba(255,255,255,.3)", fontSize: 13, cursor: "pointer", fontFamily: F }}>
            Режим демо (без аккаунта)
          </button>
        </div>
      </div>
    </div>
  );
}

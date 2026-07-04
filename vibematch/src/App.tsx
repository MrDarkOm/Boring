import { useState, useEffect } from "react";
import type { Card } from "./types";
import { F } from "./lib";
import { useGeoWeather } from "./hooks/useGeoWeather";
import { useAuth } from "./hooks/useAuth";
import { useCards } from "./hooks/useCards";
import { useAppStore, ALL_ACHIEVEMENTS } from "./store";
import { ContextSheet } from "./components/ContextSheet";
import { loadProfile, loadSaved, loadHistory, syncProfile, syncSaved, syncHistory } from "./api/sync";
import { Splash } from "./screens/Splash";
import { Onboarding } from "./screens/Onboarding";
import { AuthScreen } from "./screens/AuthScreen";
import { SwipeScreen } from "./screens/SwipeScreen";
import { MatchScreen } from "./screens/MatchScreen";
import { SavedScreen } from "./screens/SavedScreen";
import { StatsScreen } from "./screens/StatsScreen";
import { MapScreen } from "./screens/MapScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { CoopScreen } from "./screens/CoopScreen";
import { SurpriseModal } from "./screens/SurpriseModal";
import { NavBar } from "./components/NavBar";
import { Toast } from "./components/Toast";

type Phase = "splash" | "onboard" | "auth" | "main";

export default function App() {
  const [phase, setPhase] = useState<Phase>("splash");
  const [tab, setTab] = useState("swipe");
  const [matched, setMatch] = useState<Card | null>(null);
  const [openSaved, setOpenSaved] = useState<Card | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [surprise, setSurprise] = useState(false);
  const [ctxSheet, setCtxSheet] = useState(false);

  const { geo, weather, setWeather, geoState } = useGeoWeather();
  const { user } = useAuth();
  const { cards: allCards } = useCards(geo);

  const {
    profile, setProfile,
    notifs, setNotifs,
    saved, addSaved,
    swipeHistory, setSwipeHistory,
    comments, addComment,
    context, setContext,
    reset,
    recordDailyActivity,
    unlockAchievement,
    streak,
  } = useAppStore();

  // Record daily activity and check streak achievements on main load
  useEffect(() => {
    if (phase === "main") recordDailyActivity();
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance past the auth screen once a session appears
  useEffect(() => {
    if (phase === "auth" && user) setPhase("main");
  }, [phase, user]);

  // Sync from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const remote = await loadProfile(user.id);
      if (remote) {
        setProfile(remote.profile);
        setContext(remote.context);
      }
      const remoteSaved = await loadSaved(user.id);
      if (remoteSaved.length) remoteSaved.forEach(addSaved);
      const remoteHistory = await loadHistory(user.id);
      if (remoteHistory.length) setSwipeHistory(remoteHistory);
      setToast("Данные загружены из облака ☁️");
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Sync to Supabase when state changes (debounced via useEffect)
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      syncProfile(user.id, profile, context).catch(console.error);
    }, 1000);
    return () => clearTimeout(t);
  }, [user, profile, context]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      syncSaved(user.id, saved).catch(console.error);
    }, 1500);
    return () => clearTimeout(t);
  }, [user, saved]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      syncHistory(user.id, swipeHistory).catch(console.error);
    }, 1500);
    return () => clearTimeout(t);
  }, [user, swipeHistory]);

  useEffect(() => {
    if (phase === "main" && notifs.evening) {
      const t = setTimeout(() => setToast("Вечер — самое время найти чем заняться 🌙"), 5000);
      return () => clearTimeout(t);
    }
  }, [phase, notifs.evening]);

  const handleReset = () => {
    reset();
    setToast("История и сохранения сброшены");
  };

  // Unlock with a celebratory toast (only on first unlock)
  const unlock = (id: string) => {
    const already = useAppStore.getState().achievements.some((a) => a.id === id && a.unlockedAt);
    if (already) return;
    unlockAchievement(id);
    const def = ALL_ACHIEVEMENTS.find((a) => a.id === id);
    if (def) setToast(`${def.emoji} Достижение: ${def.title}!`);
  };

  const handleSwipeHistory = (h: typeof swipeHistory) => {
    setSwipeHistory(h);
    const total = h.length;
    const liked = h.filter((s) => s.dir === "right").length;
    if (total >= 1) unlock("first_swipe");
    if (total >= 10) unlock("swipe_10");
    if (total >= 50) unlock("swipe_50");
    if (liked >= 5) unlock("like_5");
    // Check all categories liked
    const cats = new Set(h.filter((s) => s.dir === "right").map((s) => s.card.cat));
    if (cats.size >= 5) unlock("all_cats");
  };

  const handleAddSaved = (c: Parameters<typeof addSaved>[0]) => {
    addSaved(c);
    const newCount = saved.filter((s) => s.id !== c.id).length + 1;
    if (newCount >= 3) unlock("save_3");
  };

  return (
    <div className="app-shell" style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: "min(390px, 100vw)",
          minHeight: "min(844px, 100dvh)",
          maxHeight: "100dvh",
          background: "#0D0D0D",
          // Rounded corners only on desktop (native app uses safe-area instead)
          borderRadius: "clamp(0px, calc((100vw - 391px) * 999), 46px)",
          overflow: "hidden",
          position: "relative",
          fontFamily: F,
          boxShadow: "0 40px 130px rgba(0,0,0,.85), inset 0 0 0 1px rgba(255,255,255,.06)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
        {surprise && <SurpriseModal onClose={() => setSurprise(false)} onMatch={(c) => { setMatch(c); setSurprise(false); }} allCards={allCards} />}
        {ctxSheet && <ContextSheet context={context} onSave={setContext} onClose={() => setCtxSheet(false)} />}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
          {phase === "splash" && <Splash onDone={() => setPhase("onboard")} />}
          {phase === "onboard" && <Onboarding onDone={(ctx) => { setContext(ctx); setPhase("auth"); }} />}
          {phase === "auth" && <AuthScreen onSkip={() => setPhase("main")} />}

          {phase === "main" && !matched && !openSaved && (
            <>
              {tab === "swipe" && (
                <SwipeScreen
                  context={context}
                  weather={weather}
                  geo={geo}
                  allCards={allCards}
                  onMatch={(c) => setMatch(c)}
                  onSaved={handleAddSaved}
                  savedCount={saved.length}
                  swipeHistory={swipeHistory}
                  onSwipeHistory={handleSwipeHistory}
                  setTab={setTab}
                  onSurprise={() => setSurprise(true)}
                  onEditContext={() => setCtxSheet(true)}
                />
              )}
              {tab === "map" && <MapScreen onBack={() => setTab("swipe")} geo={geo} />}
              {tab === "stats" && <StatsScreen history={swipeHistory} saved={saved} onBack={() => setTab("swipe")} />}
              {tab === "saved" && <SavedScreen saved={saved} onBack={() => setTab("swipe")} onOpen={(c) => setOpenSaved(c)} comments={comments} onComment={addComment} />}
              {tab === "settings" && <SettingsScreen profile={profile} onProfile={setProfile} weather={weather} onWeather={setWeather} notifs={notifs} onNotifs={setNotifs} onBack={() => setTab("swipe")} onReset={handleReset} geoState={geoState} />}
              {tab === "coop" && <CoopScreen onBack={() => setTab("swipe")} />}
            </>
          )}

          {phase === "main" && matched && <MatchScreen card={matched} geo={geo} onBack={() => setMatch(null)} onSaved={handleAddSaved} />}
          {phase === "main" && openSaved && <MatchScreen card={openSaved} geo={geo} onBack={() => setOpenSaved(null)} onSaved={handleAddSaved} />}
        </div>

        {phase === "main" && !matched && !openSaved && <NavBar tab={tab} setTab={setTab} streak={streak} />}
      </div>
    </div>
  );
}

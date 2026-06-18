import { useState, useEffect } from "react";
import type { Card } from "./types";
import { F } from "./lib";
import { useGeoWeather } from "./hooks/useGeoWeather";
import { useAuth } from "./hooks/useAuth";
import { useAppStore } from "./store";
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

  const { geo, weather, setWeather, geoState } = useGeoWeather();
  const { user } = useAuth();

  const {
    profile, setProfile,
    notifs, setNotifs,
    saved, addSaved,
    swipeHistory, setSwipeHistory,
    comments, addComment,
    context, setContext,
    reset,
  } = useAppStore();

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

  return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 0" }}>
      <div
        style={{
          width: 390,
          minHeight: 844,
          background: "#0D0D0D",
          borderRadius: 46,
          overflow: "hidden",
          position: "relative",
          fontFamily: F,
          boxShadow: "0 40px 130px rgba(0,0,0,.85), inset 0 0 0 1px rgba(255,255,255,.06)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
        {surprise && <SurpriseModal onClose={() => setSurprise(false)} onMatch={(c) => { setMatch(c); setSurprise(false); }} />}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
          {phase === "splash" && <Splash onDone={() => setPhase("onboard")} />}
          {phase === "onboard" && <Onboarding onDone={(ctx) => { setContext(ctx); setPhase("auth"); }} />}
          {phase === "auth" && <AuthScreen onSkip={() => setPhase("main")} />}

          {/* Auto-advance to main after auth */}
          {phase === "auth" && user && (() => { setPhase("main"); return null; })()}

          {phase === "main" && !matched && !openSaved && (
            <>
              {tab === "swipe" && (
                <SwipeScreen
                  context={context}
                  weather={weather}
                  geo={geo}
                  onMatch={(c) => setMatch(c)}
                  onSaved={addSaved}
                  savedCount={saved.length}
                  swipeHistory={swipeHistory}
                  onSwipeHistory={setSwipeHistory}
                  setTab={setTab}
                  onSurprise={() => setSurprise(true)}
                />
              )}
              {tab === "map" && <MapScreen onBack={() => setTab("swipe")} geo={geo} />}
              {tab === "stats" && <StatsScreen history={swipeHistory} saved={saved} onBack={() => setTab("swipe")} />}
              {tab === "saved" && <SavedScreen saved={saved} onBack={() => setTab("swipe")} onOpen={(c) => setOpenSaved(c)} comments={comments} onComment={addComment} />}
              {tab === "settings" && <SettingsScreen profile={profile} onProfile={setProfile} weather={weather} onWeather={setWeather} notifs={notifs} onNotifs={setNotifs} onBack={() => setTab("swipe")} onReset={handleReset} geoState={geoState} />}
              {tab === "coop" && <CoopScreen onBack={() => setTab("swipe")} />}
            </>
          )}

          {phase === "main" && matched && <MatchScreen card={matched} onBack={() => setMatch(null)} onSaved={addSaved} />}
          {phase === "main" && openSaved && <MatchScreen card={openSaved} onBack={() => setOpenSaved(null)} onSaved={addSaved} />}
        </div>

        {phase === "main" && !matched && !openSaved && <NavBar tab={tab} setTab={setTab} />}
      </div>
    </div>
  );
}

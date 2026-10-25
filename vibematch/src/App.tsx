import { useState, useEffect } from "react";
import type { Card, Notifs, Profile, SwipeRecord, UserContext } from "./types";
import { F } from "./lib";
import { useGeoWeather } from "./hooks/useGeoWeather";
import { useCards } from "./hooks/useCards";
import { Splash } from "./screens/Splash";
import { Onboarding } from "./screens/Onboarding";
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

export default function App() {
  const [phase, setPhase] = useState<"splash" | "onboard" | "main">("splash");
  const [tab, setTab] = useState("swipe");
  const [context, setCtx] = useState<UserContext>({ mood: null, people: null, time: null, genres: [] });
  const [matched, setMatch] = useState<Card | null>(null);
  const [saved, setSaved] = useState<Card[]>([]);
  const [swipeHistory, setHist] = useState<SwipeRecord[]>([]);
  const [openSaved, setOpenSaved] = useState<Card | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [notifs, setNotifs] = useState<Notifs>({ evening: true, sales: true, places: false });
  const [profile, setProfile] = useState<Profile>({ name: "Пользователь", avatar: "🧑" });
  const [toast, setToast] = useState<string | null>(null);
  const [surprise, setSurprise] = useState(false);

  const { geo, weather, setWeather, geoState } = useGeoWeather();
  const { cards: deck, status: sources, loading: deckLoading, reload } = useCards(geo, geoState !== "idle" && geoState !== "loading");

  const addSaved = (c: Card) => setSaved((s) => (s.find((x) => x.id === c.id) ? s : [...s, c]));
  const addComment = (id: string, txt: string) => setComments((c) => ({ ...c, [id]: txt }));

  useEffect(() => {
    if (phase === "main" && notifs.evening) {
      const t = setTimeout(() => setToast("Вечер — самое время найти чем заняться 🌙"), 5000);
      return () => clearTimeout(t);
    }
  }, [phase, notifs.evening]);

  const handleReset = () => {
    setSaved([]);
    setHist([]);
    setComments({});
    setToast("История и сохранения сброшены");
  };

  return (
    <div className="app-shell">
      <div className="app-frame" style={{ fontFamily: F }}>
        {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
        {surprise && <SurpriseModal deck={deck} onClose={() => setSurprise(false)} onMatch={(c) => { setMatch(c); setSurprise(false); }} />}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", overflowX: "hidden" }}>
          {phase === "splash" && <Splash onDone={() => setPhase("onboard")} />}
          {phase === "onboard" && <Onboarding onDone={(ctx) => { setCtx(ctx); setPhase("main"); }} />}

          {phase === "main" && !matched && !openSaved && (
            <>
              {tab === "swipe" && (
                <SwipeScreen
                  deck={deck}
                  loading={deckLoading}
                  onReload={reload}
                  context={context}
                  weather={weather}
                  geo={geo}
                  onMatch={(c) => setMatch(c)}
                  onSaved={addSaved}
                  savedCount={saved.length}
                  swipeHistory={swipeHistory}
                  onSwipeHistory={setHist}
                  setTab={setTab}
                  onSurprise={() => setSurprise(true)}
                />
              )}
              {tab === "map" && <MapScreen onBack={() => setTab("swipe")} geo={geo} deck={deck} status={sources.places} onOpen={(c) => setOpenSaved(c)} />}
              {tab === "stats" && <StatsScreen history={swipeHistory} saved={saved} onBack={() => setTab("swipe")} />}
              {tab === "saved" && <SavedScreen saved={saved} onBack={() => setTab("swipe")} onOpen={(c) => setOpenSaved(c)} comments={comments} onComment={addComment} />}
              {tab === "settings" && <SettingsScreen profile={profile} onProfile={setProfile} weather={weather} onWeather={setWeather} notifs={notifs} onNotifs={setNotifs} onBack={() => setTab("swipe")} onReset={handleReset} geoState={geoState} sources={sources} onReload={reload} />}
              {tab === "coop" && <CoopScreen onBack={() => setTab("swipe")} />}
            </>
          )}

          {phase === "main" && matched && <MatchScreen card={matched} onBack={() => setMatch(null)} onSaved={addSaved} onNotify={setToast} />}
          {phase === "main" && openSaved && <MatchScreen card={openSaved} onBack={() => setOpenSaved(null)} onSaved={addSaved} onNotify={setToast} />}
        </div>

        {phase === "main" && !matched && !openSaved && <NavBar tab={tab} setTab={setTab} />}
      </div>
    </div>
  );
}

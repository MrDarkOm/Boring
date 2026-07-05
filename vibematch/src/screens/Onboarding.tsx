import { useState } from "react";
import type { UserContext } from "../types";
import { MOODS, PEOPLE, TIMES, ALL_GENRES } from "../data";
import { t, type TKey } from "../i18n";
import { F } from "../lib";

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      className="action-btn"
      onClick={onClick}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        cursor: "pointer",
        fontFamily: F,
        background: selected ? "rgba(124,58,237,.2)" : "rgba(255,255,255,.05)",
        border: `1.5px solid ${selected ? "#7C3AED" : "rgba(255,255,255,.1)"}`,
        color: selected ? "#C4B5FD" : "rgba(255,255,255,.7)",
        fontWeight: 600,
        fontSize: 13,
        transition: "all .18s",
      }}
    >
      {label}
    </button>
  );
}

export function Onboarding({ onDone }: { onDone: (ctx: UserContext) => void }) {
  const [step, setStep] = useState(0);
  const [vals, setVals] = useState<UserContext>({ mood: null, people: null, time: null, genres: [] });
  const [anim, setAnim] = useState(true);

  const next = (s: number) => {
    setAnim(false);
    setTimeout(() => {
      setStep(s);
      setAnim(true);
    }, 160);
  };

  const steps = [
    {
      q: t("onboard.q1"),
      sub: t("onboard.sub1"),
      content: (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {MOODS.map((m) => (
            <button
              key={m.id}
              className="action-btn"
              onClick={() => {
                setVals((v) => ({ ...v, mood: m.id }));
                next(1);
              }}
              style={{
                background: vals.mood === m.id ? "rgba(124,58,237,.22)" : "rgba(255,255,255,.05)",
                border: `1.5px solid ${vals.mood === m.id ? "#7C3AED" : "rgba(255,255,255,.1)"}`,
                borderRadius: 18,
                padding: "18px 10px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                fontFamily: F,
              }}
            >
              <span style={{ fontSize: 32 }}>{m.emoji}</span>
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>{m.label}</span>
              <span style={{ color: "rgba(255,255,255,.38)", fontSize: 11 }}>{m.sub}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      q: t("onboard.q2"),
      sub: t("onboard.sub2"),
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ALL_GENRES.map((g) => {
              const sel = vals.genres.includes(g);
              return (
                <Chip
                  key={g}
                  label={t(`genre.${g}` as TKey)}
                  selected={sel}
                  onClick={() =>
                    setVals((v) => ({
                      ...v,
                      genres: sel ? v.genres.filter((x) => x !== g) : [...v.genres, g],
                    }))
                  }
                />
              );
            })}
          </div>
          <button
            className="action-btn"
            onClick={() => next(2)}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 13,
              cursor: "pointer",
              background: vals.genres.length > 0 ? "#7C3AED" : "rgba(255,255,255,.08)",
              border: "none",
              color: "#fff",
              fontWeight: 700,
              fontSize: 15,
              fontFamily: F,
            }}
          >
            {t("onboard.continue")} {vals.genres.length > 0 ? `(${vals.genres.length})` : ""}
          </button>
        </div>
      ),
    },
    {
      q: t("onboard.q3"),
      sub: t("onboard.sub3"),
      content: (
        <div style={{ display: "flex", gap: 10 }}>
          {PEOPLE.map((p) => (
            <Chip
              key={p}
              label={t(`people.${p}` as TKey)}
              selected={vals.people === p}
              onClick={() => {
                setVals((v) => ({ ...v, people: p }));
                next(3);
              }}
            />
          ))}
        </div>
      ),
    },
    {
      q: t("onboard.q4"),
      sub: t("onboard.sub4"),
      content: (
        <div style={{ display: "flex", gap: 10 }}>
          {TIMES.map((tm) => (
            <Chip
              key={tm}
              label={t(`time.${tm}` as TKey)}
              selected={vals.time === tm}
              onClick={() => {
                const nv = { ...vals, time: tm };
                setVals(nv);
                setTimeout(() => onDone(nv), 260);
              }}
            />
          ))}
        </div>
      ),
    },
  ];

  const s = steps[step];
  return (
    <div
      style={{
        flex: 1,
        padding: "52px 22px 36px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        background: "linear-gradient(180deg,#0D0D18 0%,#0D0D0D 100%)",
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        {steps.map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 99,
              transition: "background .3s",
              background: i <= step ? "#7C3AED" : "rgba(255,255,255,.1)",
            }}
          />
        ))}
      </div>
      <div className={anim ? "fade-up" : ""} key={"q" + step}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", lineHeight: 1.2, fontFamily: F }}>{s.q}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 4 }}>{s.sub}</div>
      </div>
      <div className={anim ? "fade-up" : ""} key={"c" + step} style={{ animationDelay: ".04s", display: "flex", flexDirection: "column", gap: 12 }}>
        {s.content}
      </div>
    </div>
  );
}

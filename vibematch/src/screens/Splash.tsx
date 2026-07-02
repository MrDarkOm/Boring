import { useState, useEffect } from "react";
import { F } from "../lib";

export function Splash({ onDone }: { onDone: () => void }) {
  const [out, setOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setOut(true), 1800);
    const t2 = setTimeout(onDone, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        background: "radial-gradient(ellipse at 50% 35%,#2D1B69 0%,#0C0C16 65%)",
        transition: "opacity .4s",
        opacity: out ? 0 : 1,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Floating ambient orbs */}
      <div className="float-orb" style={{ position: "absolute", top: "18%", left: "12%", width: 130, height: 130, borderRadius: "50%", background: "#7C3AED", filter: "blur(70px)", opacity: 0.35 }} />
      <div className="float-orb" style={{ position: "absolute", bottom: "22%", right: "10%", width: 110, height: 110, borderRadius: "50%", background: "#34D399", filter: "blur(75px)", opacity: 0.18, animationDelay: "-4s" }} />
      <div className="float-orb" style={{ position: "absolute", top: "60%", left: "20%", width: 90, height: 90, borderRadius: "50%", background: "#FB7185", filter: "blur(65px)", opacity: 0.14, animationDelay: "-7s" }} />

      <div style={{ fontSize: 76, animation: "splashPulse 1.8s ease-in-out infinite", position: "relative" }}>✨</div>
      <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: -1.5, fontFamily: F, position: "relative" }}>вайбматч</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.35)", letterSpacing: 3.5, textTransform: "uppercase", position: "relative", fontFamily: F }}>
        найди чем заняться
      </div>
    </div>
  );
}

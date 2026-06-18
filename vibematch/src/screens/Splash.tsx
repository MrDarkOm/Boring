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
        background: "radial-gradient(ellipse at 50% 35%,#2D1B69 0%,#0D0D18 65%)",
        transition: "opacity .4s",
        opacity: out ? 0 : 1,
      }}
    >
      <div style={{ fontSize: 76, animation: "splashPulse 1.8s ease-in-out infinite" }}>✨</div>
      <div style={{ fontSize: 34, fontWeight: 900, color: "#fff", letterSpacing: -1.5, fontFamily: F }}>вайбматч</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.3)", letterSpacing: 3, textTransform: "uppercase" }}>
        найди чем заняться
      </div>
    </div>
  );
}

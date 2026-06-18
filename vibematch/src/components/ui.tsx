import type { CSSProperties, ReactNode } from "react";

export function Glow({
  color,
  top = -80,
  right = -80,
  size = 220,
  opacity = 0.22,
}: {
  color: string;
  top?: number | string;
  right?: number | string;
  size?: number;
  opacity?: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top,
        right,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(72px)",
        opacity,
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}

export function Tag({ children }: { children: ReactNode }) {
  const style: CSSProperties = {
    background: "rgba(255,255,255,.08)",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 99,
    padding: "5px 12px",
    fontSize: 12,
    color: "rgba(255,255,255,.6)",
    whiteSpace: "nowrap",
  };
  return <span style={style}>{children}</span>;
}

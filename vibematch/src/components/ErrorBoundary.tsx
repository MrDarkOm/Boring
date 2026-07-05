import { Component, type ErrorInfo, type ReactNode } from "react";
import { F } from "../lib";
import { t } from "../i18n";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#080810",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            fontFamily: F,
          }}
        >
          <div
            style={{
              maxWidth: 360,
              background: "#0D0D0D",
              border: "1px solid rgba(239,68,68,.3)",
              borderRadius: 20,
              padding: 28,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{t("err.title")}</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 24, lineHeight: 1.6 }}>
              {this.state.error.message}
            </div>
            <button
              onClick={() => this.setState({ error: null })}
              style={{
                padding: "11px 28px",
                background: "rgba(239,68,68,.15)",
                border: "1px solid rgba(239,68,68,.3)",
                borderRadius: 12,
                color: "#EF4444",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: F,
              }}
            >
              {t("err.retry")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useState } from "react";
import { supabase } from "../api/supabase";
import { AUTH_CALLBACK_URL, isNative } from "../lib/deepLinks";
import { F } from "../lib";
import { t } from "../i18n";

interface Props {
  onSkip: () => void;
}

export function AuthScreen({ onSkip }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Native uses the custom-scheme PKCE callback handled in lib/deepLinks.ts;
  // web redirects to the app origin (never location.href — hash/query would
  // break the code exchange).
  const redirectTo = isNative() ? AUTH_CALLBACK_URL : window.location.origin;

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    if (!supabase) { setError(t("auth.notConfigured")); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  };

  const signInWithOAuth = async (provider: "google" | "apple") => {
    if (!supabase) { setError(t("auth.notConfigured")); return; }
    setError(null);
    const { data, error: err } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: isNative() },
    });
    if (err) { setError(err.message); return; }
    if (isNative() && data?.url) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url: data.url });
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", fontFamily: F }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8, textAlign: "center" }}>{t("auth.title")}</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,.45)", marginBottom: 32, textAlign: "center", lineHeight: 1.6 }}>
        {t("auth.subtitle")}
      </div>

      {sent ? (
        <div style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 16, padding: "20px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📬</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#22C55E", marginBottom: 6 }}>{t("auth.sent")}</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,.55)", lineHeight: 1.6 }}>
            {t("auth.sentHint", { email })}
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
            style={{
              width: "100%", padding: "14px 16px", background: "rgba(255,255,255,.07)",
              border: "1px solid rgba(255,255,255,.15)", borderRadius: 14, color: "#fff",
              fontSize: 15, fontFamily: F, outline: "none", boxSizing: "border-box", marginBottom: 12,
            }}
          />
          {error && <div style={{ fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{error}</div>}
          <button
            onClick={sendMagicLink}
            disabled={loading}
            style={{
              width: "100%", padding: "14px 0",
              background: loading ? "rgba(124,58,237,.3)" : "linear-gradient(90deg,#7C3AED,#6D28D9)",
              border: "none", borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: loading ? "default" : "pointer", fontFamily: F, marginBottom: 12,
            }}
          >
            {loading ? t("auth.sending") : t("auth.emailBtn")}
          </button>

          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,.25)", marginBottom: 12 }}>{t("common.or")}</div>

          <button
            onClick={() => signInWithOAuth("google")}
            style={{
              width: "100%", padding: "14px 0",
              background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.15)",
              borderRadius: 14, color: "#fff", fontWeight: 600, fontSize: 14,
              cursor: "pointer", fontFamily: F, marginBottom: 10,
            }}
          >
            {t("auth.google")}
          </button>

          <button
            onClick={() => signInWithOAuth("apple")}
            style={{
              width: "100%", padding: "14px 0",
              background: "#fff", border: "none",
              borderRadius: 14, color: "#000", fontWeight: 700, fontSize: 14,
              cursor: "pointer", fontFamily: F,
            }}
          >
            {t("auth.apple")}
          </button>
        </div>
      )}

      <button
        onClick={onSkip}
        style={{ marginTop: 24, fontSize: 13, color: "rgba(255,255,255,.3)", background: "none", border: "none", cursor: "pointer", fontFamily: F }}
      >
        {t("auth.skip")}
      </button>
    </div>
  );
}

// Native deep-link handler for the OAuth/magic-link PKCE callback.
// The native shells must register the custom scheme (see scripts/build-native.mjs):
//   iOS Info.plist  → CFBundleURLTypes with scheme "vibematch"
//   AndroidManifest → intent-filter with <data android:scheme="vibematch"/>
import { Capacitor } from "@capacitor/core";
import { supabase } from "../api/supabase";

export const AUTH_CALLBACK_URL = "vibematch://auth-callback";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function initDeepLinks() {
  if (!isNative() || !supabase) return;
  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");

  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(AUTH_CALLBACK_URL)) return;
    try {
      const code = new URL(url).searchParams.get("code");
      if (code) await supabase!.auth.exchangeCodeForSession(code);
    } finally {
      Browser.close().catch(() => {});
    }
  });
}

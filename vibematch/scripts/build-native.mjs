#!/usr/bin/env node
// Build script for Capacitor iOS/Android production releases
// Usage: node scripts/build-native.mjs [ios|android|both]
//
// ── Deep links (OAuth/magic-link callback, src/lib/deepLinks.ts) ──
// After the first `cap sync`, register the custom scheme in the native shells:
//
// iOS — ios/App/App/Info.plist:
//   <key>CFBundleURLTypes</key>
//   <array><dict>
//     <key>CFBundleURLSchemes</key><array><string>vibematch</string></array>
//   </dict></array>
//
// Android — android/app/src/main/AndroidManifest.xml (inside MainActivity):
//   <intent-filter>
//     <action android:name="android.intent.action.VIEW" />
//     <category android:name="android.intent.category.DEFAULT" />
//     <category android:name="android.intent.category.BROWSABLE" />
//     <data android:scheme="vibematch" android:host="auth-callback" />
//   </intent-filter>
//
// Also add vibematch://auth-callback to Supabase Auth → URL Configuration →
// Redirect URLs. For Apple Sign-In, enable the Apple provider in Supabase
// (needs an Apple Services ID + key from developer.apple.com).

import { execSync } from "child_process";

const platform = process.argv[2] ?? "both";

function run(cmd) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

console.log("📦 Building web bundle...");
run("npm run build");

if (platform === "ios" || platform === "both") {
  console.log("\n🍎 Syncing iOS...");
  run("npx cap sync ios");
  console.log("✅ iOS synced. Open Xcode: npx cap open ios");
}

if (platform === "android" || platform === "both") {
  console.log("\n🤖 Syncing Android...");
  run("npx cap sync android");
  console.log("✅ Android synced. Open Android Studio: npx cap open android");
}

console.log("\n🚀 Build complete!");

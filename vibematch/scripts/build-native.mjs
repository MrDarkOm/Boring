#!/usr/bin/env node
// Build script for Capacitor iOS/Android production releases
// Usage: node scripts/build-native.mjs [ios|android|both]

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

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The /api/* routes are forwarded to the local proxy server (server/proxy.mjs)
// so the Anthropic API key never reaches the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});

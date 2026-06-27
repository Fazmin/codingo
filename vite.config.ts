import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

// Dev-only proxies so the Vercel AI SDK can call providers without CORS while
// running `npm run dev` in a normal browser. In production (Tauri build) the
// app routes provider calls through tauri-plugin-http instead (see lib/ai/provider.ts).
export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/proxy/openai": {
        target: "https://api.openai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openai/, ""),
      },
      "/proxy/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/anthropic/, ""),
      },
    },
  },
}));

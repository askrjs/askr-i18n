import { defineConfig } from "vite";

/**
 * Minimal dev server config used only to serve tests/browser/harness.html
 * for the native Playwright browser tests. Not used for the library build
 * (see vite.config.ts / `vp pack`).
 */
export default defineConfig({
  server: {
    host: "127.0.0.1",
    port: 4310,
    strictPort: true,
  },
});

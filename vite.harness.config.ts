import { defineConfig } from "vite-plus";

/**
 * Minimal dev server config used only to serve tests/browser/harness.html
 * for the native Playwright browser tests. Not used for the library build
 * (see vite.config.ts / `vp pack`).
 */
export default defineConfig({
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
  },
  server: {
    host: "127.0.0.1",
    port: 4310,
    strictPort: true,
  },
});

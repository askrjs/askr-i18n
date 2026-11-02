import { defineConfig } from "vite-plus";
export default defineConfig({
  test: {
    include: ["tests/*.test.ts"],
  },
  pack: {
    deps: { resolveDepSubpath: true },
    entry: { index: "src/index.ts" },
    format: ["esm"],
    outDir: "dist",
    platform: "neutral",
    dts: true,
    unbundle: true,
  },
});

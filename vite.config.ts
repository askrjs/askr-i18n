import { defineConfig } from "vite-plus";
export default defineConfig({
  test: {
    include: ["tests/*.test.ts"],
  },
  pack: {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    outDir: "dist",
    platform: "neutral",
    dts: true,
    unbundle: true,
  },
});

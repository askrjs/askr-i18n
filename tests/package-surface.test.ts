import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as api from "../src/index";

describe("package surface", () => {
  it("should expose only the application-owned service factory at runtime", () => {
    expect(Object.keys(api).sort()).toEqual(["createI18n"]);
  });

  it("should publish the built root and package metadata only", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { exports: Record<string, unknown>; publishConfig: { access: string } };

    expect(Object.keys(manifest.exports).sort()).toEqual([".", "./package.json"]);
    expect(manifest.publishConfig.access).toBe("public");
  });
});

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error("npm_execpath is required for the installed-package smoke test.");
}

const { version: expectedVersion } = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8"),
);

const temporaryRoot = mkdtempSync(join(tmpdir(), "askrjs-i18n-installed-"));
const packed = join(temporaryRoot, "packed");
const consumer = join(temporaryRoot, "consumer");
mkdirSync(packed);
mkdirSync(consumer);

try {
  const packOutput = execFileSync(
    process.execPath,
    [npmCli, "pack", "--ignore-scripts", "--json", "--pack-destination", packed],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  const packResult = JSON.parse(packOutput);
  // npm has returned both an array and a name-keyed object from `pack --json`.
  const { filename } = Array.isArray(packResult) ? packResult[0] : Object.values(packResult)[0];
  const packageJson = {
    name: "askrjs-i18n-installed-smoke",
    private: true,
    type: "module",
    dependencies: { "@askrjs/askr": "0.5.0" },
  };
  writeFileSync(join(consumer, "package.json"), `${JSON.stringify(packageJson, null, 2)}\n`);

  execFileSync(
    process.execPath,
    [npmCli, "install", "--package-lock=false", join(packed, filename)],
    { cwd: consumer, stdio: "pipe" },
  );
  execFileSync(process.execPath, [npmCli, "ls", "@askrjs/askr", "--all"], {
    cwd: consumer,
    stdio: "pipe",
  });
  const installedManifest = JSON.parse(
    readFileSync(join(consumer, "node_modules", "@askrjs", "i18n", "package.json"), "utf8"),
  );
  if (installedManifest.version !== expectedVersion) {
    throw new Error(
      `Expected packed @askrjs/i18n@${expectedVersion}, received ${installedManifest.version}.`,
    );
  }
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `
import assert from "node:assert/strict";
import * as api from "@askrjs/i18n";
import { renderToStringSync } from "@askrjs/askr/ssr";
import manifest from "@askrjs/i18n/package.json" with { type: "json" };
assert.equal(manifest.version, ${JSON.stringify(expectedVersion)});
assert.deepEqual(Object.keys(api).sort(), ["applyLocaleAttributes", "createI18n", "localeAttributes", "resolveTextDirection"]);
const service = api.createI18n("en", { en: { label: (name) => "Hello " + name }, ar: { label: (name) => "مرحبا " + name } });
let snapshot;
assert.equal(renderToStringSync(() => service.Scope({ locale: "ar", children: () => { snapshot = service.dehydrate(); return service.text("label", "Ada"); } })), "مرحبا Ada");
assert.deepEqual(snapshot, { version: 1, locale: "ar", dir: "rtl", catalog: "ar" });
assert.equal(service.format("en", "label", "Ada"), "Hello Ada");
assert.throws(() => service.format("en", "toString"), /Missing i18n message/);
assert.deepEqual(api.localeAttributes("he-IL-u-ca-hebrew"), { lang: "he-IL-u-ca-hebrew", dir: "rtl" });
await assert.rejects(import("@askrjs/i18n/dist/i18n.js"), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
`,
    ],
    { cwd: consumer, stdio: "pipe" },
  );
  writeFileSync(
    join(consumer, "types.ts"),
    `
import { createI18n, type Catalog, type CatalogMessage, type I18nHydration } from "@askrjs/i18n";
const label: CatalogMessage<[string]> = (name) => "Hello " + name;
const source = { label } satisfies Catalog;
const service = createI18n("en", { en: source, ar: { label: (name: string) => "مرحبا " + name } });
const snapshot: I18nHydration<"en" | "ar"> = { version: 1, locale: "ar", dir: "rtl", catalog: "ar" };
service.Scope({ hydration: snapshot });
service.format("en", "label", "Ada");
${[
  "I18n",
  "I18nScopeProps",
  "LocaleAttributeTarget",
  "LocaleAttributes",
  "TextDirection",
  "CatalogKey",
  "LocaleOf",
  "MessageArgs",
  "MessageAt",
  "SameTuple",
  "ValidCatalog",
  "ValidCatalogs",
]
  .map(
    (name) => `// @ts-expect-error ${name} is private in 0.5
import type { ${name} } from "@askrjs/i18n";`,
  )
  .join("\n")}
// @ts-expect-error message arguments remain catalog-derived
service.format("en", "label", 42);
// @ts-expect-error unknown locale remains invalid
service.format("fr", "label", "Ada");
// @ts-expect-error all catalogs must contain every source message
createI18n("en", { en: source, ar: {} });
`,
  );
  writeFileSync(
    join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
      },
      files: ["types.ts"],
    }),
  );
  execFileSync(
    process.execPath,
    [resolve("node_modules/typescript/bin/tsc"), "-p", join(consumer, "tsconfig.json")],
    { stdio: "inherit" },
  );
  console.log("Packed i18n runtime/types, minimum peer, SSR snapshot, and private paths passed.");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

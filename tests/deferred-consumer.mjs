import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { hydrateSPA } from "@askrjs/askr/boot";
import { createI18n } from "@askrjs/i18n";
import { jsx } from "@askrjs/askr/jsx-runtime";
import { createRouteRegistry, route, Resolve, defer, routeData } from "@askrjs/askr/router";
import { renderRouteRequest } from "@askrjs/askr/ssr";

const i18n = createI18n("en", {
  en: { greeting: () => "hello" },
  fr: { greeting: () => "bonjour" },
});
async function render(locale, pending) {
  const registry = createRouteRegistry(() =>
    route(
      "/",
      () =>
        jsx(i18n.Scope, {
          locale,
          children: jsx(Resolve, {
            value: routeData().load,
            pending: "loading",
            children: () => jsx("p", { children: i18n.text("greeting") }),
          }),
        }),
      { loader: () => ({ load: defer(pending) }) },
    ),
  );
  const result = await renderRouteRequest({ registry, url: "/" });
  assert.equal(result.kind, "render");
  return { result, registry };
}
const immediate = await render("fr", Promise.resolve("done"));
assert.match(immediate.result.html, /<p>bonjour<\/p>/);
const deferred = ["fr", "en"].map(() => Promise.withResolvers());
const [fr, en] = await Promise.all(
  ["fr", "en"].map(async (locale, i) => {
    const { result, registry } = await render(locale, deferred[i].promise);
    const reader = result.stream.getReader();
    const shell = new TextDecoder().decode((await reader.read()).value);
    assert.match(shell, /loading/);
    return { reader, shell, registry };
  }),
);
const dom = new JSDOM("<!doctype html><body></body>", { url: "https://example.test/" });
for (const key of [
  "window",
  "document",
  "Node",
  "Element",
  ...Object.getOwnPropertyNames(dom.window).filter((name) => /^HTML.*Element$/.test(name)),
  "SVGElement",
  "NodeFilter",
  "DocumentFragment",
  "Text",
  "Comment",
  "location",
  "history",
  "MutationObserver",
]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
try {
  for (const [index, { reader, shell, registry }, expected] of [
    [1, en, "hello"],
    [0, fr, "bonjour"],
  ]) {
    deferred[index].resolve("done");
    const decoder = new TextDecoder();
    const patch = decoder.decode((await reader.read()).value);
    assert.ok(patch.includes("<p>" + expected + "</p>"));
    const hydration = decoder.decode((await reader.read()).value);
    assert.equal((await reader.read()).done, true);
    const root = document.createElement("main");
    root.innerHTML = shell + patch + hydration;
    document.body.append(root);
    await hydrateSPA({ root, registry, hydrate: { verifyMarkup: true } });
    assert.equal(root.querySelector("p").textContent, expected);
    assert.equal(root.querySelector("template, askr-resolve"), null);
    root.remove();
  }
} finally {
  dom.window.close();
}

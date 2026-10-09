import { applyLocaleAttributes, createI18n, localeAttributes } from "../../src/index";

declare global {
  interface Window {
    askrI18n: {
      applyLocaleAttributes: typeof applyLocaleAttributes;
      localeAttributes: typeof localeAttributes;
      lifecycle: typeof lifecycle;
    };
  }
}

import { state } from "@askrjs/askr";
import { cleanupApp, hydrateSPA } from "@askrjs/askr/boot";
import { createRouteRegistry, route } from "@askrjs/askr/router";
import { renderToStringSync } from "@askrjs/askr/ssr";
import { jsx } from "@askrjs/askr/jsx-runtime";

const messages = createI18n("en", {
  en: { greeting: () => "Hello", empty: () => "" },
  ar: { greeting: () => "مرحبا", empty: () => "" },
});
let root: HTMLElement | undefined;
let selectLocale: ((locale: "en" | "ar") => void) | undefined;
let showScope: ((show: boolean) => void) | undefined;

function content() {
  return jsx("section", {
    id: "locale-boundary",
    ...messages.attributes(),
    children: [
      jsx("p", { id: "message", children: messages.text("greeting") }),
      messages.Scope({
        locale: "en",
        dir: "rtl",
        children: () =>
          jsx("span", {
            id: "override",
            ...messages.attributes(),
            children: messages.text("empty"),
          }),
      }),
    ],
  });
}

const lifecycle = {
  async setup() {
    let snapshot!: ReturnType<typeof messages.dehydrate>;
    const html = renderToStringSync(() =>
      messages.Scope({
        locale: "ar",
        children: () => {
          snapshot = messages.dehydrate();
          return content();
        },
      }),
    );
    root = document.createElement("div");
    root.innerHTML = html;
    document.body.append(root);
    const before = root.firstElementChild;
    function App() {
      const selection = state<Parameters<typeof messages.Scope>[0]>({ hydration: snapshot });
      const visible = state(true);
      selectLocale = (locale) => selection.set({ locale });
      showScope = visible.set;
      return visible()
        ? messages.Scope({ ...selection(), children: content })
        : jsx("section", { id: "locale-boundary", children: "outside" });
    }
    const registry = createRouteRegistry(() => {
      route(location.pathname, App);
    });
    await hydrateSPA({ root, registry, hydrate: { verifyMarkup: true } });
    return {
      snapshot,
      html,
      adoptedElement: root.firstElementChild === before,
      attributes: lifecycle.read(),
    };
  },
  read() {
    const boundary = root?.querySelector("#locale-boundary");
    const override = root?.querySelector("#override");
    return {
      lang: boundary?.getAttribute("lang") ?? null,
      dir: boundary?.getAttribute("dir") ?? null,
      text: root?.querySelector("#message")?.textContent ?? boundary?.textContent,
      overrideLang: override?.getAttribute("lang") ?? null,
      overrideDir: override?.getAttribute("dir") ?? null,
    };
  },
  async change(locale: "en" | "ar") {
    selectLocale?.(locale);
    await Promise.resolve();
    await Promise.resolve();
    return lifecycle.read();
  },
  async show(show: boolean) {
    showScope?.(show);
    await Promise.resolve();
    await Promise.resolve();
    return lifecycle.read();
  },
  teardown() {
    if (root) {
      cleanupApp(root);
      root.remove();
      root = undefined;
    }
  },
};
window.askrI18n = { applyLocaleAttributes, localeAttributes, lifecycle };

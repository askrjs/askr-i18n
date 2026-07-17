import { describe, expect, it } from "vitest";
import { renderToStringSync } from "@askrjs/askr/ssr";
import { createI18n, type I18nHydration } from "../src/index";

const messages = createI18n("en", {
  en: {
    greeting: ({ name }: { name: string }) => `Hello, ${name}`,
    total: (value: number) => new Intl.NumberFormat("en-US").format(value),
  },
  ar: {
    greeting: ({ name }: { name: string }) => `مرحبا، ${name}`,
    total: (value: number) => new Intl.NumberFormat("ar").format(value),
  },
});

describe("createI18n", () => {
  it("should render typed catalog messages from the active lexical scope", () => {
    const html = renderToStringSync(() =>
      messages.Scope({
        locale: "en",
        children: () => messages.text("greeting", { name: "Ada" }),
      }),
    );

    expect(html).toBe("Hello, Ada");
    expect(messages.format("en", "total", 1234)).toBe("1,234");
  });

  it("should isolate locale ownership between service instances", async () => {
    const alternate = createI18n("en", {
      en: { label: () => "alternate" },
      ar: { label: () => "بديل" },
    });

    const [english, arabic, isolated] = await Promise.all([
      Promise.resolve().then(() =>
        renderToStringSync(() =>
          messages.Scope({
            locale: "en",
            children: () => messages.text("greeting", { name: "A" }),
          }),
        ),
      ),
      Promise.resolve().then(() =>
        renderToStringSync(() =>
          messages.Scope({
            locale: "ar",
            dir: "rtl",
            children: () => messages.text("greeting", { name: "ب" }),
          }),
        ),
      ),
      Promise.resolve().then(() =>
        renderToStringSync(() =>
          alternate.Scope({ locale: "en", children: () => alternate.text("label") }),
        ),
      ),
    ]);

    expect(english).toBe("Hello, A");
    expect(arabic).toBe("مرحبا، ب");
    expect(isolated).toBe("alternate");
  });

  it("should round-trip locale, direction, and catalog identity for hydration", () => {
    let snapshot: I18nHydration<"en" | "ar"> | undefined;

    renderToStringSync(() =>
      messages.Scope({
        locale: "ar",
        dir: "rtl",
        children: () => {
          snapshot = messages.dehydrate();
          return `${messages.locale()}:${messages.direction()}:${messages.catalog()}`;
        },
      }),
    );

    expect(snapshot).toEqual({ version: 1, locale: "ar", dir: "rtl", catalog: "ar" });
    expect(Object.isFrozen(snapshot)).toBe(true);

    const adopted = renderToStringSync(() =>
      messages.Scope({
        hydration: snapshot!,
        children: () => messages.text("greeting", { name: "ب" }),
      }),
    );
    expect(adopted).toBe("مرحبا، ب");
  });

  it("should reject unknown locale and mismatched hydration identities", () => {
    expect(() => messages.Scope({ locale: "missing" as "en", children: "nope" })).toThrow(
      "Unknown i18n locale",
    );

    expect(() =>
      messages.Scope({
        hydration: { version: 1, locale: "en", dir: "ltr", catalog: "ar" },
      }),
    ).toThrow("catalog must match");
  });

  it("should reject invalid catalogs for untyped callers and own frozen copies", () => {
    expect(() =>
      createI18n("en", {
        en: { greeting: (name: string) => name },
        fr: {} as { greeting: (name: string) => string },
      }),
    ).toThrow("missing greeting");
    expect(() =>
      createI18n("en", {
        en: { greeting: (name: string) => name },
        fr: { greeting: () => "bonjour" } as { greeting: (name: string) => string },
      }),
    ).toThrow("Invalid i18n message signature");

    const source = { label: () => "owned" };
    const owned = createI18n("en", { en: source });
    source.label = () => "mutated";
    expect(owned.format("en", "label")).toBe("owned");
    expect(Object.isFrozen(owned.catalogs)).toBe(true);
    expect(Object.isFrozen(owned.catalogs.en)).toBe(true);
  });
});

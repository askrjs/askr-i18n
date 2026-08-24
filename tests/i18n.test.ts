import { describe, expect, it } from "vitest";
import { renderToStringSync } from "@askrjs/askr/ssr";
import {
  applyLocaleAttributes,
  createI18n,
  localeAttributes,
  resolveTextDirection,
  type I18nHydration,
} from "../src/index";

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
  it("should resolve modern locale directions with explicit deterministic overrides", () => {
    expect(resolveTextDirection("en-US")).toBe("ltr");
    expect(resolveTextDirection("ar")).toBe("rtl");
    expect(resolveTextDirection("fa-Arab-IR")).toBe("rtl");
    expect(resolveTextDirection("en-US", "rtl")).toBe("rtl");
    expect(resolveTextDirection("application-locale-key")).toBe("ltr");
    expect(() => resolveTextDirection("en-US", "sideways" as never)).toThrow(
      "Invalid i18n text direction: sideways",
    );
  });

  it("should resolve direction from likely scripts when getTextInfo is unavailable", () => {
    const prototype = Intl.Locale.prototype as Intl.Locale & {
      getTextInfo?: () => { direction: "ltr" | "rtl" };
      textInfo?: { direction: "ltr" | "rtl" };
    };
    const getTextInfo = Object.getOwnPropertyDescriptor(prototype, "getTextInfo");
    const textInfo = Object.getOwnPropertyDescriptor(prototype, "textInfo");
    try {
      Object.defineProperty(prototype, "getTextInfo", { value: undefined, configurable: true });
      Object.defineProperty(prototype, "textInfo", { value: undefined, configurable: true });
      expect(resolveTextDirection("az-Arab")).toBe("rtl");
      expect(resolveTextDirection("pa-Guru")).toBe("ltr");
    } finally {
      if (getTextInfo) Object.defineProperty(prototype, "getTextInfo", getTextInfo);
      else delete prototype.getTextInfo;
      if (textInfo) Object.defineProperty(prototype, "textInfo", textInfo);
      else delete prototype.textInfo;
    }
  });

  it("should build frozen semantic attributes and apply them to an explicit target", () => {
    const attributes = localeAttributes("he-IL");
    const applied = new Map<string, string>();
    const target = { setAttribute: (name: string, value: string) => applied.set(name, value) };
    applyLocaleAttributes(target, attributes);
    expect(attributes).toEqual({ lang: "he-IL", dir: "rtl" });
    expect(Object.isFrozen(attributes)).toBe(true);
    expect(applied.get("lang")).toBe("he-IL");
    expect(applied.get("dir")).toBe("rtl");
    expect(() =>
      applyLocaleAttributes(target, { lang: "invalid", dir: "sideways" as never }),
    ).toThrow("Invalid i18n text direction: sideways");
    expect(applied.get("lang")).toBe("he-IL");
  });

  it("should expose semantic attributes from the active lexical scope", () => {
    const html = renderToStringSync(() =>
      messages.Scope({
        locale: "ar",
        children: () => JSON.stringify(messages.attributes()),
      }),
    );
    expect(html).toBe('{"lang":"ar","dir":"rtl"}');
  });
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

  it.each([
    {
      hydration: { version: 1, locale: "en", dir: "sideways", catalog: "en" },
    },
    { locale: "en", dir: "sideways" },
  ])("should reject invalid runtime text direction input", (props) => {
    expect(() =>
      renderToStringSync(() =>
        messages.Scope({
          ...props,
          children: () => messages.direction(),
        } as never),
      ),
    ).toThrow("Invalid i18n text direction: sideways");
  });

  it.each(["", "auto", "RTL", "left-to-right", null, 0])(
    "should reject additional initial and hydrated direction value %j",
    (dir) => {
      expect(() =>
        renderToStringSync(() =>
          messages.Scope({ locale: "en", dir, children: () => messages.direction() } as never),
        ),
      ).toThrow("Invalid i18n text direction");
      expect(() =>
        renderToStringSync(() =>
          messages.Scope({
            hydration: { version: 1, locale: "en", catalog: "en", dir },
            children: () => messages.direction(),
          } as never),
        ),
      ).toThrow("Invalid i18n text direction");
    },
  );

  it("should switch locales after hydration without retaining direction state", () => {
    const hydrated = renderToStringSync(() =>
      messages.Scope({
        hydration: { version: 1, locale: "ar", catalog: "ar", dir: "rtl" },
        children: () => `${messages.locale()}:${messages.direction()}`,
      }),
    );
    const switched = renderToStringSync(() =>
      messages.Scope({
        locale: "en",
        children: () => `${messages.locale()}:${messages.direction()}`,
      }),
    );
    expect(hydrated).toBe("ar:rtl");
    expect(switched).toBe("en:ltr");
  });

  it("should support complex plural categories through application-owned message functions", () => {
    const plurals = createI18n("ar", {
      ar: {
        items: (count: number) => new Intl.PluralRules("ar").select(count),
      },
      pl: {
        items: (count: number) => new Intl.PluralRules("pl").select(count),
      },
    });
    expect([0, 1, 2, 3, 11, 100].map((count) => plurals.format("ar", "items", count))).toEqual([
      "zero",
      "one",
      "two",
      "few",
      "many",
      "other",
    ]);
    expect([1, 2, 5, 1.5].map((count) => plurals.format("pl", "items", count))).toEqual([
      "one",
      "few",
      "many",
      "other",
    ]);
  });

  it("should preserve placeholder-shaped interpolation values and mixed-direction text", () => {
    const literal = "Ada {name} {{total}}";
    expect(messages.format("en", "greeting", { name: literal })).toBe(`Hello, ${literal}`);
    expect(messages.format("ar", "greeting", { name: "Ada 123" })).toBe("مرحبا، Ada 123");
  });

  it("should reject absent, partial, and missing-key catalog access explicitly", () => {
    expect(() => createI18n("en", {} as never)).toThrow("at least one catalog");
    expect(() =>
      createI18n("en", {
        en: { first: () => "first", second: () => "second" },
        fr: { first: () => "premier" } as never,
      }),
    ).toThrow("missing second");
    const unsafeFormat = messages.format as unknown as (locale: string, key: string) => string;
    expect(() => unsafeFormat("en", "missing")).toThrow("Missing i18n message: en.missing");
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

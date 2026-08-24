import {
  createI18n,
  type Catalog,
  type CatalogMessage,
  type I18n,
  type I18nHydration,
  type I18nScopeProps,
  type TextDirection,
} from "../src/index";

const i18n = createI18n("en", {
  en: {
    greeting: ({ name }: { name: string }) => `Hello, ${name}`,
    count: (value: number) => String(value),
  },
  fr: {
    greeting: ({ name }: { name: string }) => `Bonjour, ${name}`,
    count: (value: number) => String(value),
  },
});

i18n.text("greeting", { name: "Ada" });
i18n.format("fr", "count", 2);

const direction: TextDirection = "rtl";
const message: CatalogMessage<[string]> = (value) => value;
const catalog: Catalog = { message };
const service: I18n<typeof i18n.catalogs> = i18n;
const hydration: I18nHydration<"en" | "fr"> = {
  version: 1,
  locale: "fr",
  dir: direction,
  catalog: "fr",
};
const scopeProps: I18nScopeProps<"en" | "fr"> = { hydration };
void [catalog, service, scopeProps];

createI18n("en", {
  en: { greeting: (name: string) => name },
  // @ts-expect-error every locale must contain every source key
  fr: {},
});
createI18n("en", {
  en: { greeting: (name: string) => name },
  // @ts-expect-error extra locale keys are rejected
  fr: { greeting: (name: string) => name, extra: () => "extra" },
});
createI18n("en", {
  en: { greeting: (name: string) => name },
  // @ts-expect-error message argument tuples must match the source locale
  fr: { greeting: (count: number) => String(count) },
});

// @ts-expect-error message arguments remain catalog-derived
i18n.text("greeting", { id: 1 });
// @ts-expect-error unknown catalog keys are rejected
i18n.text("missing");
// @ts-expect-error applications must resolve to a declared locale
i18n.format("de", "count", 2);

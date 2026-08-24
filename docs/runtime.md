# Runtime contract

Each `createI18n(sourceLocale, catalogs)` call owns a distinct lexical scope. `i18n.text()`
reads only that service's nearest `i18n.Scope`, so concurrent applications and
nested services do not share mutable locale state.

Catalog entries are typed TypeScript functions. Use the platform `Intl` APIs in
those functions for number, date, plural, and list formatting. This package
does not ship an ICU parser.

The source catalog defines the exact message keys and argument tuples for every
locale. The application remains responsible for choosing a locale. Unknown
locales and invalid catalogs throw rather than silently crossing boundaries.

Direction is semantic HTML state. `localeAttributes(locale, dir?)` resolves a
frozen `{ lang, dir }` pair for an SSR template, nested DOM boundary, or client
locale switch. `applyLocaleAttributes(target, attributes)` updates only the
explicit target it receives; the package never mutates the global document as a
side effect. Inside a scope, `i18n.attributes()` returns the active pair.

Apply document attributes before hydration so the server markup and first
client frame agree. Use a nested element with its own `lang` and `dir` for an
opposing-language subtree. Use `<bdi>` or `dir="auto"` for runtime content whose
direction is unknown, and logical CSS properties for direction-sensitive
layout.

The hydration snapshot has this stable shape:

```ts
type I18nHydration<Locale extends string> = Readonly<{
  version: 1;
  locale: Locale;
  dir: "ltr" | "rtl";
  catalog: Locale;
}>;
```

The snapshot contains identity, not executable catalog functions. Catalog code
continues to be supplied by the application bundle.

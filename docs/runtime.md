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

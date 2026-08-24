# @askrjs/i18n

[![CI](https://github.com/askrjs/askr-i18n/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/askrjs/askr-i18n/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40askrjs%2Fi18n.svg)](https://www.npmjs.com/package/@askrjs/i18n)

Typed, application-owned internationalization for Askr. The package does not
choose locales, parse ICU messages, or install process-global state.

```tsx
import { createI18n } from "@askrjs/i18n";

const i18n = createI18n("en", {
  en: {
    welcome: ({ name }: { name: string }) => `Welcome, ${name}`,
    total: (value: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value),
  },
  fr: {
    welcome: ({ name }: { name: string }) => `Bienvenue, ${name}`,
    total: (value: number) =>
      new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value),
  },
});

function Welcome() {
  return <h1>{i18n.text("welcome", { name: "Ada" })}</h1>;
}

function LocalizedMain() {
  return (
    <main {...i18n.attributes()}>
      <Welcome />
    </main>
  );
}

<i18n.Scope locale="fr">
  <LocalizedMain />
</i18n.Scope>;
```

## Language and direction

Locale state and HTML direction must change together. For the initial server
render, apply the same frozen attributes to the document element:

```tsx
import { applyLocaleAttributes, localeAttributes } from "@askrjs/i18n";

const attributes = localeAttributes(locale);
// Server template: <html lang={attributes.lang} dir={attributes.dir}>

// Client boot and later locale switches use the same resolved attributes.
applyLocaleAttributes(document.documentElement, attributes);
```

`localeAttributes()` uses `Intl.Locale#getTextInfo()` where available and a
deterministic compatibility fallback. Pass an explicit second argument when an
application uses a non-default script policy that needs an override:

```ts
const attributes = localeAttributes("az-Arab", "rtl");
```

`i18n.attributes()` reads the active lexical scope. Spread it onto a real DOM
element when a nested subtree uses a different language or direction. The
package does not insert a wrapper or mutate the global document implicitly.

For user-provided text whose direction is unknown, use semantic HTML isolation:

```tsx
<p>
  Account: <bdi>{userDisplayName}</bdi>
</p>
<input dir="auto" name="displayName" />
```

Use CSS logical properties (`margin-inline-start`, `padding-inline`,
`inset-inline-end`, `text-align: start`) for direction-sensitive layout rather
than mirrored left/right rules.

Applications own locale resolution from URL prefixes, hosts, cookies, or user
profiles. `i18n.dehydrate()` returns an immutable, versioned snapshot containing
the active locale, direction, and selected catalog identity. Pass that snapshot
back as `<i18n.Scope hydration={snapshot}>` during hydration.

The first argument names the source locale. Its exact keys and message argument
tuples are required from every other locale; missing, extra, or incompatible
messages fail during type checking and are also rejected at runtime.

See [the runtime contract](docs/runtime.md) for isolation and hydration details.

import { defineScope, readScope } from '@askrjs/askr';
import type { JSXElement } from '@askrjs/askr/foundations/structures';

export type TextDirection = 'ltr' | 'rtl';
export type CatalogMessage<Args extends readonly unknown[] = never[]> = (
  ...args: Args
) => string;
export type Catalog = Readonly<Record<string, CatalogMessage>>;

type LocaleOf<Catalogs extends Record<string, Catalog>> = keyof Catalogs & string;
type CatalogKey<Catalogs extends Record<string, Catalog>> = {
  [Locale in keyof Catalogs]: keyof Catalogs[Locale];
}[keyof Catalogs] &
  string;
type MessageAt<
  Catalogs extends Record<string, Catalog>,
  Key extends PropertyKey,
> = {
  [Locale in keyof Catalogs]: Key extends keyof Catalogs[Locale]
    ? Catalogs[Locale][Key]
    : never;
}[keyof Catalogs];
type MessageArgs<Message> = Message extends (...args: infer Args) => string
  ? Args
  : never;

export type I18nHydration<Locale extends string = string> = Readonly<{
  version: 1;
  locale: Locale;
  dir: TextDirection;
  catalog: Locale;
}>;

export type I18nScopeProps<Locale extends string> =
  | {
      locale: Locale;
      dir?: TextDirection;
      hydration?: never;
      children?: unknown;
    }
  | {
      locale?: never;
      dir?: never;
      hydration: I18nHydration<Locale>;
      children?: unknown;
    };

type ScopeState<Locale extends string> = {
  locale: Locale;
  dir: TextDirection;
  catalog: Locale;
};

export interface I18n<Catalogs extends Record<string, Catalog>> {
  readonly catalogs: Readonly<Catalogs>;
  readonly Scope: (
    props: I18nScopeProps<LocaleOf<Catalogs>>,
  ) => JSXElement;
  text<Key extends CatalogKey<Catalogs>>(
    key: Key,
    ...args: MessageArgs<MessageAt<Catalogs, Key>>
  ): string;
  format<
    Locale extends LocaleOf<Catalogs>,
    Key extends keyof Catalogs[Locale] & string,
  >(
    locale: Locale,
    key: Key,
    ...args: MessageArgs<Catalogs[Locale][Key]>
  ): string;
  locale(): LocaleOf<Catalogs>;
  direction(): TextDirection;
  catalog(): LocaleOf<Catalogs>;
  dehydrate(): I18nHydration<LocaleOf<Catalogs>>;
}

/**
 * Creates an application-owned internationalization service.
 *
 * Catalog values are ordinary typed TypeScript functions. Locale selection is
 * intentionally left to the application and installed lexically through Scope.
 */
export function createI18n<const Catalogs extends Record<string, Catalog>>(
  catalogs: Catalogs,
): I18n<Catalogs> {
  const locales = Object.keys(catalogs) as LocaleOf<Catalogs>[];
  if (locales.length === 0) {
    throw new Error('createI18n requires at least one catalog.');
  }

  const ownedCatalogs = Object.freeze({ ...catalogs }) as Readonly<Catalogs>;
  const scopeState = defineScope<ScopeState<LocaleOf<Catalogs>> | null>(null);

  const assertLocale = (locale: string): LocaleOf<Catalogs> => {
    if (!Object.prototype.hasOwnProperty.call(ownedCatalogs, locale)) {
      throw new Error(`Unknown i18n locale: ${locale}.`);
    }
    return locale as LocaleOf<Catalogs>;
  };

  const active = (): ScopeState<LocaleOf<Catalogs>> => {
    const value = readScope(scopeState);
    if (!value) {
      throw new Error('i18n.text() must be called within this service\'s <i18n.Scope>.');
    }
    return value;
  };

  const format = <
    Locale extends LocaleOf<Catalogs>,
    Key extends keyof Catalogs[Locale] & string,
  >(
    locale: Locale,
    key: Key,
    ...args: MessageArgs<Catalogs[Locale][Key]>
  ): string => {
    const selectedLocale = assertLocale(locale);
    const message = ownedCatalogs[selectedLocale][key];
    if (typeof message !== 'function') {
      throw new Error(`Missing i18n message: ${selectedLocale}.${key}.`);
    }
    return (message as unknown as (...values: unknown[]) => string)(...args);
  };

  const Scope = (props: I18nScopeProps<LocaleOf<Catalogs>>): JSXElement => {
    const hydrated = props.hydration;
    if (hydrated && hydrated.version !== 1) {
      throw new Error(`Unsupported i18n hydration version: ${String(hydrated.version)}.`);
    }

    const requestedLocale = hydrated?.locale ?? props.locale;
    if (requestedLocale === undefined) {
      throw new Error('i18n.Scope requires a locale or hydration snapshot.');
    }
    const locale = assertLocale(requestedLocale);
    if (hydrated && hydrated.catalog !== locale) {
      throw new Error('The hydrated i18n catalog must match its locale.');
    }

    const value = Object.freeze({
      locale,
      dir: hydrated?.dir ?? props.dir ?? 'ltr',
      catalog: locale,
    });

    const children = props.children as Parameters<typeof scopeState>[0]['children'];
    return scopeState({ value, children }) as JSXElement;
  };

  return Object.freeze({
    catalogs: ownedCatalogs,
    Scope,
    text<Key extends CatalogKey<Catalogs>>(
      key: Key,
      ...args: MessageArgs<MessageAt<Catalogs, Key>>
    ): string {
      const selected = active();
      const message = ownedCatalogs[selected.locale][key];
      if (typeof message !== 'function') {
        throw new Error(`Missing i18n message: ${selected.locale}.${key}.`);
      }
      return (message as unknown as (...values: unknown[]) => string)(...args);
    },
    format,
    locale: () => active().locale,
    direction: () => active().dir,
    catalog: () => active().catalog,
    dehydrate: () => {
      const value = active();
      return Object.freeze({
        version: 1 as const,
        locale: value.locale,
        dir: value.dir,
        catalog: value.catalog,
      });
    },
  });
}

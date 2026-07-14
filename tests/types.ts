import { createI18n } from '../src/index';

const i18n = createI18n({
  en: {
    greeting: ({ name }: { name: string }) => `Hello, ${name}`,
    count: (value: number) => String(value),
  },
  fr: {
    greeting: ({ name }: { name: string }) => `Bonjour, ${name}`,
    count: (value: number) => String(value),
  },
});

i18n.text('greeting', { name: 'Ada' });
i18n.format('fr', 'count', 2);

// @ts-expect-error message arguments remain catalog-derived
i18n.text('greeting', { id: 1 });
// @ts-expect-error unknown catalog keys are rejected
i18n.text('missing');
// @ts-expect-error applications must resolve to a declared locale
i18n.format('de', 'count', 2);

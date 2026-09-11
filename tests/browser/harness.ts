import { applyLocaleAttributes, localeAttributes } from "../../src/index";

declare global {
  interface Window {
    askrI18n: {
      applyLocaleAttributes: typeof applyLocaleAttributes;
      localeAttributes: typeof localeAttributes;
    };
  }
}

window.askrI18n = { applyLocaleAttributes, localeAttributes };

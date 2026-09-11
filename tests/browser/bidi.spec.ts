import { expect, test } from "@playwright/test";

test.describe("semantic locale boundaries", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/tests/browser/harness.html");
  });

  test("should switch document language and direction together", async ({ page }) => {
    const result = await page.evaluate(() => {
      const { applyLocaleAttributes, localeAttributes } = window.askrI18n;

      applyLocaleAttributes(document.documentElement, localeAttributes("ar"));
      const ar = {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        direction: getComputedStyle(document.documentElement).direction,
      };

      applyLocaleAttributes(document.documentElement, localeAttributes("en-US"));
      const enUS = {
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        direction: getComputedStyle(document.documentElement).direction,
      };

      return { ar, enUS };
    });

    expect(result.ar.lang).toBe("ar");
    expect(result.ar.dir).toBe("rtl");
    expect(result.ar.direction).toBe("rtl");

    expect(result.enUS.lang).toBe("en-US");
    expect(result.enUS.dir).toBe("ltr");
    expect(result.enUS.direction).toBe("ltr");
  });

  test("should isolate nested opposing locale boundaries", async ({ page }) => {
    const result = await page.evaluate(() => {
      const { applyLocaleAttributes, localeAttributes } = window.askrI18n;

      const outer = document.createElement("section");
      const inner = document.createElement("span");
      applyLocaleAttributes(outer, localeAttributes("ar"));
      applyLocaleAttributes(inner, localeAttributes("en"));
      inner.textContent = "Version 12.3";
      outer.append("الإصدار ", inner, " متاح");
      document.body.append(outer);

      return {
        outerDirection: getComputedStyle(outer).direction,
        innerDirection: getComputedStyle(inner).direction,
        innerClosestIsOuter: inner.closest('[dir="rtl"]') === outer,
      };
    });

    expect(result.outerDirection).toBe("rtl");
    expect(result.innerDirection).toBe("ltr");
    expect(result.innerClosestIsOuter).toBe(true);
  });

  test("should let bdi and dir=auto isolate unknown-direction runtime content", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const paragraph = document.createElement("p");
      paragraph.dir = "ltr";
      const unknownName = document.createElement("bdi");
      unknownName.textContent = "مستخدم 123";
      const input = document.createElement("input");
      input.dir = "auto";
      input.value = "שלום 456";
      paragraph.append("User ", unknownName, ": 42", input);
      document.body.append(paragraph);

      return {
        unicodeBidi: getComputedStyle(unknownName).unicodeBidi,
        unknownNameDirection: getComputedStyle(unknownName).direction,
        inputDirection: getComputedStyle(input).direction,
        paragraphText: paragraph.textContent,
      };
    });

    expect(result.unicodeBidi).toBe("isolate");
    expect(result.unknownNameDirection).toBe("rtl");
    expect(result.inputDirection).toBe("rtl");
    expect(result.paragraphText).toBe("User مستخدم 123: 42");
  });

  test("should mirror logical spacing without mirrored physical rules", async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.createElement("div");
      const item = document.createElement("span");
      container.dir = "rtl";
      item.style.marginInlineStart = "13px";
      container.append(item);
      document.body.append(container);

      const style = getComputedStyle(item);
      return { marginRight: style.marginRight, marginLeft: style.marginLeft };
    });

    expect(result.marginRight).toBe("13px");
    expect(result.marginLeft).toBe("0px");
  });

  test("should mirror logical overlay anchoring with the document direction", async ({ page }) => {
    const result = await page.evaluate(() => {
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "absolute",
        insetInlineEnd: "7px",
        width: "20px",
      });
      document.body.append(overlay);

      document.documentElement.dir = "ltr";
      const ltrRight = getComputedStyle(overlay).right;
      const ltrLeft = overlay.getBoundingClientRect().left;

      document.documentElement.dir = "rtl";
      const rtlLeft = getComputedStyle(overlay).left;
      const rtlBoundingLeft = overlay.getBoundingClientRect().left;

      return { ltrRight, ltrLeft, rtlLeft, rtlBoundingLeft };
    });

    expect(result.ltrRight).toBe("7px");
    expect(result.rtlLeft).toBe("7px");
    expect(result.ltrLeft).toBeGreaterThan(result.rtlBoundingLeft);
  });
});

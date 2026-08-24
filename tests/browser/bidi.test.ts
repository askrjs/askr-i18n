import { afterEach, describe, expect, it } from "vitest";
import { applyLocaleAttributes, localeAttributes } from "../../src/index";

const originalLanguage = document.documentElement.lang;
const originalDirection = document.documentElement.dir;

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.lang = originalLanguage;
  document.documentElement.dir = originalDirection;
});

describe("semantic locale boundaries", () => {
  it("should switch document language and direction together", () => {
    applyLocaleAttributes(document.documentElement, localeAttributes("ar"));
    expect(document.documentElement.lang).toBe("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(getComputedStyle(document.documentElement).direction).toBe("rtl");

    applyLocaleAttributes(document.documentElement, localeAttributes("en-US"));
    expect(document.documentElement.lang).toBe("en-US");
    expect(document.documentElement.dir).toBe("ltr");
    expect(getComputedStyle(document.documentElement).direction).toBe("ltr");
  });

  it("should isolate nested opposing locale boundaries", () => {
    const outer = document.createElement("section");
    const inner = document.createElement("span");
    applyLocaleAttributes(outer, localeAttributes("ar"));
    applyLocaleAttributes(inner, localeAttributes("en"));
    inner.textContent = "Version 12.3";
    outer.append("الإصدار ", inner, " متاح");
    document.body.append(outer);

    expect(getComputedStyle(outer).direction).toBe("rtl");
    expect(getComputedStyle(inner).direction).toBe("ltr");
    expect(inner.closest('[dir="rtl"]')).toBe(outer);
  });

  it("should let bdi and dir=auto isolate unknown-direction runtime content", () => {
    const paragraph = document.createElement("p");
    paragraph.dir = "ltr";
    const unknownName = document.createElement("bdi");
    unknownName.textContent = "مستخدم 123";
    const input = document.createElement("input");
    input.dir = "auto";
    input.value = "שלום 456";
    paragraph.append("User ", unknownName, ": 42", input);
    document.body.append(paragraph);

    expect(getComputedStyle(unknownName).unicodeBidi).toBe("isolate");
    expect(getComputedStyle(unknownName).direction).toBe("rtl");
    expect(getComputedStyle(input).direction).toBe("rtl");
    expect(paragraph.textContent).toBe("User مستخدم 123: 42");
  });

  it("should mirror logical spacing without mirrored physical rules", () => {
    const container = document.createElement("div");
    const item = document.createElement("span");
    container.dir = "rtl";
    item.style.marginInlineStart = "13px";
    container.append(item);
    document.body.append(container);

    const style = getComputedStyle(item);
    expect(style.marginRight).toBe("13px");
    expect(style.marginLeft).toBe("0px");
  });

  it("should mirror logical overlay anchoring with the document direction", () => {
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "absolute",
      insetInlineEnd: "7px",
      width: "20px",
    });
    document.body.append(overlay);

    document.documentElement.dir = "ltr";
    expect(getComputedStyle(overlay).right).toBe("7px");
    const ltrLeft = overlay.getBoundingClientRect().left;

    document.documentElement.dir = "rtl";
    expect(getComputedStyle(overlay).left).toBe("7px");
    expect(ltrLeft).toBeGreaterThan(overlay.getBoundingClientRect().left);
  });
});

import { describe, expect, it } from "vitest";
import { getTokenCodeIdentifier } from "./index";

describe("getTokenCodeIdentifier", () => {
  it("returns the Android resource name", () => {
    expect(getTokenCodeIdentifier('<color name="miuix_bg_light">@color/white</color>', "android")).toBe("miuix_bg_light");
    expect(getTokenCodeIdentifier('<style name="title" parent="body" />', "android")).toBe("title");
  });

  it("returns the CSS custom property name", () => {
    expect(getTokenCodeIdentifier("--color-bg-primary: #FFFFFF;", "css")).toBe("--color-bg-primary");
  });

  it("falls back to the whole snippet", () => {
    expect(getTokenCodeIdentifier("", "css")).toBe("");
    expect(getTokenCodeIdentifier("<!-- unsupported -->", "android")).toBe("<!-- unsupported -->");
  });
});

import { describe, it, expect } from "vitest";
import {
  detectFormat,
  isFigmaNative,
  isVariables2CSS,
} from "./format-detector";

describe("format-detector", () => {
  describe("detectFormat", () => {
    it("returns unknown for null or non-object", () => {
      expect(detectFormat(null)).toBe("unknown");
      expect(detectFormat(undefined)).toBe("unknown");
      expect(detectFormat("string")).toBe("unknown");
      expect(detectFormat(123)).toBe("unknown");
    });

    it("returns figma-native for Figma export structure", () => {
      const figmaJSON = {
        collections: [
          {
            id: "col_1",
            name: "Colors",
            modes: [{ modeId: "mode_1", name: "Light" }],
            variableIds: ["var_1"],
          },
        ],
        variables: {
          var_1: {
            id: "var_1",
            name: "color/blue",
            type: "COLOR",
            valuesByMode: {
              mode_1: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
            },
          },
        },
      };
      expect(detectFormat(figmaJSON)).toBe("figma-native");
    });

    it("returns variables2css for Variables2CSS structure", () => {
      const v2cssJSON = {
        collections: [
          {
            name: "Tokens",
            modes: ["Light"],
            variables: [
              {
                name: "color/blue",
                type: "COLOR",
                values: {
                  Light: { value: "#0000ff", type: "COLOR" },
                },
              },
            ],
          },
        ],
      };
      expect(detectFormat(v2cssJSON)).toBe("variables2css");
    });

    it("returns unknown for invalid structure", () => {
      expect(detectFormat({})).toBe("unknown");
      expect(detectFormat({ collections: [] })).toBe("unknown");
    });
  });

  describe("isFigmaNative", () => {
    it("returns true for Figma format", () => {
      const figmaJSON = {
        collections: [
          {
            id: "col_1",
            name: "Colors",
            modes: [{ modeId: "mode_1", name: "Light" }],
            variableIds: ["var_1"],
          },
        ],
        variables: {
          var_1: {
            id: "var_1",
            name: "color/blue",
            type: "COLOR",
            valuesByMode: {
              mode_1: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
            },
          },
        },
      };
      expect(isFigmaNative(figmaJSON)).toBe(true);
    });

    it("returns false for Variables2CSS format", () => {
      const v2cssJSON = {
        collections: [
          { name: "T", modes: ["L"], variables: [] },
        ],
      };
      expect(isFigmaNative(v2cssJSON)).toBe(false);
    });
  });

  describe("isVariables2CSS", () => {
    it("returns true for Variables2CSS format", () => {
      const v2cssJSON = {
        collections: [
          { name: "T", modes: ["L"], variables: [] },
        ],
      };
      expect(isVariables2CSS(v2cssJSON)).toBe(true);
    });
  });
});

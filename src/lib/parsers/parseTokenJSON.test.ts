import { describe, it, expect } from "vitest";
import { parseTokenJSON } from "./index";

describe("parseTokenJSON", () => {
  it("returns null for invalid JSON", () => {
    expect(parseTokenJSON(null)).toBeNull();
    expect(parseTokenJSON("invalid")).toBeNull();
    expect(parseTokenJSON({})).toBeNull();
  });

  it("parses Figma native format", () => {
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
          description: "Primary blue",
          scopes: ["ALL_SCOPES"],
          valuesByMode: {
            mode_1: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
          },
        },
      },
    };
    const result = parseTokenJSON(figmaJSON);
    expect(result).not.toBeNull();
    expect(result!.collections).toHaveLength(1);
    expect(result!.collections[0].name).toBe("Colors");
    expect(Object.keys(result!.tokens)).toContain("var_1");
    expect(result!.tokens.var_1.name).toBe("color/blue");
    expect(result!.tokens.var_1.type).toBe("COLOR");
    expect(result!.tokens.var_1.description).toBe("Primary blue");
    expect(result!.tokens.var_1.scopes).toEqual(["ALL_SCOPES"]);
  });

  it("parses Variables2CSS format", () => {
    const v2cssJSON = {
      collections: [
        {
          name: "Tokens",
          modes: ["Light"],
          variables: [
            {
              name: "color/primary",
              type: "COLOR",
              values: {
                Light: { value: "#3b82f6", type: "COLOR" },
              },
            },
          ],
        },
      ],
    };
    const result = parseTokenJSON(v2cssJSON);
    expect(result).not.toBeNull();
    expect(result!.collections).toHaveLength(1);
    expect(result!.collections[0].name).toBe("Tokens");
    const tokenIds = result!.collections[0].tokenIds;
    expect(tokenIds).toHaveLength(1);
    const token = result!.tokens[tokenIds[0]];
    expect(token.name).toBe("color/primary");
    expect(token.type).toBe("COLOR");
  });
});

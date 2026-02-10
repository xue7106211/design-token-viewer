import { describe, it, expect } from "vitest";
import { resolveTokens, getAliasChain } from "./token-resolver";
import type { ParsedTokenData, DesignToken } from "@/types/token";

function makeToken(
  id: string,
  name: string,
  rawValues: DesignToken["rawValues"]
): DesignToken {
  return {
    id,
    name,
    path: name.split("/"),
    type: "COLOR",
    collection: "Test",
    group: name.split("/").slice(0, -1).join("/"),
    rawValues,
    resolvedValues: {},
    isAlias: false,
    referencedBy: [],
  };
}

describe("resolveTokens", () => {
  it("resolves concrete values as-is", () => {
    const data: ParsedTokenData = {
      collections: [
        {
          id: "col_1",
          name: "Test",
          modes: [{ modeId: "mode_1", name: "Light" }],
          tokenIds: ["t1"],
        },
      ],
      tokens: {
        t1: makeToken("t1", "color/blue", {
          mode_1: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
        }),
      },
    };
    const result = resolveTokens(data);
    expect(result.tokens.t1.resolvedValues.mode_1).toEqual({
      type: "COLOR",
      value: { r: 0, g: 0, b: 1, a: 1 },
    });
  });

  it("resolves alias references", () => {
    const data: ParsedTokenData = {
      collections: [
        {
          id: "col_1",
          name: "Test",
          modes: [{ modeId: "mode_1", name: "Light" }],
          tokenIds: ["t1", "t2"],
        },
      ],
      tokens: {
        t1: makeToken("t1", "color/blue", {
          mode_1: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
        }),
        t2: makeToken("t2", "color/primary", {
          mode_1: { type: "ALIAS", id: "t1" },
        }),
      },
    };
    const result = resolveTokens(data);
    expect(result.tokens.t2.resolvedValues.mode_1).toEqual({
      type: "COLOR",
      value: { r: 0, g: 0, b: 1, a: 1 },
    });
    expect(result.tokens.t1.referencedBy).toContain("t2");
  });

  it("detects circular references", () => {
    const data: ParsedTokenData = {
      collections: [
        {
          id: "col_1",
          name: "Test",
          modes: [{ modeId: "mode_1", name: "Light" }],
          tokenIds: ["t1", "t2"],
        },
      ],
      tokens: {
        t1: makeToken("t1", "color/a", {
          mode_1: { type: "ALIAS", id: "t2" },
        }),
        t2: makeToken("t2", "color/b", {
          mode_1: { type: "ALIAS", id: "t1" },
        }),
      },
    };
    const result = resolveTokens(data);
    expect(result.tokens.t1.resolvedValues.mode_1).toEqual({
      type: "STRING",
      value: "[Circular Reference]",
    });
  });
});

describe("getAliasChain", () => {
  it("returns chain for alias token", () => {
    const tokens: Record<string, DesignToken> = {
      t1: makeToken("t1", "color/blue", {
        mode_1: { type: "COLOR", value: { r: 0, g: 0, b: 1, a: 1 } },
      }),
      t2: makeToken("t2", "color/primary", {
        mode_1: { type: "ALIAS", id: "t1" },
      }),
    };
    const chain = getAliasChain("t2", "mode_1", tokens);
    expect(chain).toHaveLength(2);
    expect(chain[0].name).toBe("color/primary");
    expect(chain[1].name).toBe("color/blue");
  });
});

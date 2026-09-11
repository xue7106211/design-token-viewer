import { describe, expect, it } from "vitest";
import { rebuildRawJSON } from "./token-rebuilder";

const token = {
  id: "var_1",
  name: "space/card",
  path: ["space", "card"],
  type: "NUMBER" as const,
  collection: "Reference",
  group: "space",
  rawValues: { light: { type: "NUMBER" as const, value: 16 } },
  resolvedValues: { light: { type: "NUMBER" as const, value: 16 } },
  isAlias: false,
  referencedBy: [],
  description: "Card spacing",
  scopes: ["GAP"],
};

describe("rebuildRawJSON", () => {
  it("preserves token descriptions and scopes", () => {
    const result = rebuildRawJSON(
      [{ id: "col_1", name: "Reference", modes: [{ modeId: "light", name: "Light" }], tokenIds: [token.id] }],
      { [token.id]: token }
    );

    expect(result.variables.var_1.description).toBe("Card spacing");
    expect(result.variables.var_1.scopes).toEqual(["GAP"]);
  });
});

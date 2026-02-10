import { describe, it, expect } from "vitest";
import { buildTokenTree } from "./tree-builder";
import type { DesignToken } from "@/types/token";

function makeToken(
  id: string,
  name: string,
  collection: string
): DesignToken {
  return {
    id,
    name,
    path: name.split("/"),
    type: "COLOR",
    collection,
    group: name.split("/").slice(0, -1).join("/"),
    rawValues: {},
    resolvedValues: {},
    isAlias: false,
    referencedBy: [],
  };
}

describe("buildTokenTree", () => {
  it("builds hierarchical tree from flat tokens", () => {
    const tokens: DesignToken[] = [
      makeToken("t1", "color/blue/500", "Test"),
      makeToken("t2", "color/blue/600", "Test"),
      makeToken("t3", "color/red/500", "Test"),
    ];
    const tree = buildTokenTree(tokens, "Test");
    expect(tree).toHaveLength(1);
    expect(tree[0].label).toBe("color");
    expect(tree[0].children).toHaveLength(2); // blue, red
    const blue = tree[0].children.find((c) => c.label === "blue");
    expect(blue?.children).toHaveLength(2); // 500, 600
    expect(blue?.children?.map((c) => c.tokenId)).toContain("t1");
    expect(blue?.children?.map((c) => c.tokenId)).toContain("t2");
  });

  it("filters by collection name", () => {
    const tokens: DesignToken[] = [
      makeToken("t1", "color/blue", "CollectionA"),
      makeToken("t2", "color/red", "CollectionB"),
    ];
    const tree = buildTokenTree(tokens, "CollectionA");
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].tokenId).toBe("t1");
  });

  it("calculates token counts", () => {
    const tokens: DesignToken[] = [
      makeToken("t1", "color/blue/500", "Test"),
      makeToken("t2", "color/blue/600", "Test"),
    ];
    const tree = buildTokenTree(tokens, "Test");
    const colorNode = tree[0];
    const blueNode = colorNode.children[0];
    expect(colorNode.tokenCount).toBe(2);
    expect(blueNode.tokenCount).toBe(2);
  });
});

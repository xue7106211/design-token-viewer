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

  it("uses the Semantic Token group order at the tree root", () => {
    const tokens: DesignToken[] = [
      makeToken("t1", "text/default/primary", "Semantic Token"),
      makeToken("t2", "radius/container", "Semantic Token"),
      makeToken("t3", "bg/layout/page", "Semantic Token"),
      makeToken("t4", "padding/horizontal/container", "Semantic Token"),
      makeToken("t5", "fill/default/primary", "Semantic Token"),
      makeToken("t6", "gap/horizontal/md", "Semantic Token"),
      makeToken("t7", "mask/default", "Semantic Token"),
      makeToken("t8", "margin/default", "Semantic Token"),
      makeToken("t9", "stroke/border/default", "Semantic Token"),
      makeToken("t10", "text_style/miuix_text_style_body_large_regular", "Semantic Token"),
    ];

    const tree = buildTokenTree(tokens, "Semantic Token");

    expect(tree.map((node) => node.label)).toEqual([
      "bg",
      "fill",
      "stroke",
      "text",
      "mask",
      "margin",
      "padding",
      "gap",
      "radius",
      "text_style",
    ]);
  });
});

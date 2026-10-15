import type { DesignToken, TokenTreeNode } from "@/types/token";

const SEMANTIC_TOKEN_GROUP_ORDER = [
  "bg",
  "fill",
  "stroke",
  "text",
  "mask",
  "margin",
  "padding",
  "gap",
  "radius",
  "height",
  "safe_area",
  "text_style",
];

/**
 * Build a hierarchical tree from flat tokens for sidebar navigation.
 */
export function buildTokenTree(
  tokens: DesignToken[],
  collectionName?: string
): TokenTreeNode[] {
  const filtered = collectionName
    ? tokens.filter((t) => t.collection === collectionName)
    : tokens;

  const root: TokenTreeNode = {
    label: "root",
    path: "",
    children: [],
    tokenCount: 0,
  };

  for (const token of filtered) {
    let current = root;

    for (let i = 0; i < token.path.length; i++) {
      const segment = token.path[i];
      const fullPath = token.path.slice(0, i + 1).join("/");
      const isLeaf = i === token.path.length - 1;

      let child = current.children.find((c) => c.path === fullPath);

      if (!child) {
        child = {
          label: segment,
          path: fullPath,
          children: [],
          tokenCount: 0,
          ...(isLeaf ? { tokenId: token.id, tokenType: token.type } : {}),
        };
        current.children.push(child);
      }

      if (isLeaf) {
        child.tokenId = token.id;
        child.tokenType = token.type;
      }

      current = child;
    }
  }

  // Calculate token counts
  calculateTokenCounts(root);

  // Semantic Token 的一级组按设计系统层级展示，其余节点保持自然排序。
  sortTree(
    root,
    collectionName === "Semantic Token" ? SEMANTIC_TOKEN_GROUP_ORDER : undefined
  );

  return root.children;
}

function calculateTokenCounts(node: TokenTreeNode): number {
  if (node.tokenId) {
    node.tokenCount = 1;
    return 1;
  }
  let count = 0;
  for (const child of node.children) {
    count += calculateTokenCounts(child);
  }
  node.tokenCount = count;
  return count;
}

function sortTree(node: TokenTreeNode, rootGroupOrder?: string[]): void {
  node.children.sort((a, b) => {
    // Groups before leaves
    const aIsGroup = a.children.length > 0;
    const bIsGroup = b.children.length > 0;
    if (aIsGroup !== bIsGroup) return aIsGroup ? -1 : 1;

    if (node.path === "" && rootGroupOrder) {
      const aIndex = rootGroupOrder.indexOf(a.label);
      const bIndex = rootGroupOrder.indexOf(b.label);
      if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }
    }

    return a.label.localeCompare(b.label, undefined, { numeric: true });
  });
  for (const child of node.children) {
    sortTree(child, rootGroupOrder);
  }
}

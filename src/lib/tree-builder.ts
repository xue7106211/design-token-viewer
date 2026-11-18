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
  collectionName?: string,
  tokenOrder?: string[]
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

  // Semantic Token 的一级组按设计系统层级展示，其余分组按名称自然排序。
  // 同一分组内的 Token 按 Collection 顺序（即列表拖拽排序的结果）排列。
  const leafRank = tokenOrder ? new Map(tokenOrder.map((id, index) => [id, index])) : undefined;
  sortTree(
    root,
    collectionName === "Semantic Token" ? SEMANTIC_TOKEN_GROUP_ORDER : undefined,
    leafRank
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

function sortTree(
  node: TokenTreeNode,
  rootGroupOrder?: string[],
  leafRank?: Map<string, number>
): void {
  node.children.sort((a, b) => {
    // Groups before leaves
    const aIsGroup = a.children.length > 0;
    const bIsGroup = b.children.length > 0;
    if (aIsGroup !== bIsGroup) return aIsGroup ? -1 : 1;

    if (!aIsGroup && leafRank) {
      const aRank = a.tokenId != null ? leafRank.get(a.tokenId) : undefined;
      const bRank = b.tokenId != null ? leafRank.get(b.tokenId) : undefined;
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;
    }

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
    sortTree(child, rootGroupOrder, leafRank);
  }
}

/**
 * 按侧边栏树的展示顺序（深度优先）排列 Token id，让列表与侧边栏一致。
 * 不在树中的 id 保持原相对顺序，排在最后。
 */
export function orderTokenIdsByTree(tree: TokenTreeNode[], ids: string[]): string[] {
  const rank = new Map<string, number>();
  const visit = (nodes: TokenTreeNode[]) => {
    for (const node of nodes) {
      if (node.tokenId != null && !rank.has(node.tokenId)) rank.set(node.tokenId, rank.size);
      visit(node.children);
    }
  };
  visit(tree);
  return ids
    .map((id, index) => ({ id, index, rank: rank.get(id) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ id }) => id);
}

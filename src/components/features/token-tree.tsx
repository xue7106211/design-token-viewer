"use client";

import { ChevronRight, Palette, Hash, Type, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTokenStore } from "@/stores/token-store";
import type { TokenTreeNode, TokenType } from "@/types/token";

function TokenTypeIcon({ type, className }: { type?: TokenType; className?: string }) {
  const iconClass = cn("h-3.5 w-3.5 shrink-0", className);
  switch (type) {
    case "COLOR":
      return <Palette className={iconClass} />;
    case "NUMBER":
      return <Hash className={iconClass} />;
    case "STRING":
      return <Type className={iconClass} />;
    case "BOOLEAN":
      return <ToggleLeft className={iconClass} />;
    default:
      return null;
  }
}

function TreeNode({
  node,
  depth = 0,
}: {
  node: TokenTreeNode;
  depth?: number;
}) {
  const expandedPaths = useTokenStore((s) => s.expandedPaths);
  const togglePath = useTokenStore((s) => s.togglePath);
  const selectToken = useTokenStore((s) => s.selectToken);
  const scrollToGroup = useTokenStore((s) => s.scrollToGroup);
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);

  const isExpanded = expandedPaths.has(node.path);
  const isLeaf = node.children.length === 0 && node.tokenId !== undefined;
  const isSelected = node.tokenId === selectedTokenId;

  const handleClick = () => {
    if (isLeaf && node.tokenId) {
      selectToken(node.tokenId);
    } else {
      togglePath(node.path);
      scrollToGroup(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs cursor-pointer",
          "transition-colors duration-200 ease",
          "hover:bg-accent",
          isSelected && "bg-accent text-accent-foreground font-medium",
          !isSelected && "text-foreground/80"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {!isLeaf && (
          <ChevronRight
            className={cn(
              "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-90"
            )}
          />
        )}
        {isLeaf && <TokenTypeIcon type={node.tokenType} className="text-muted-foreground" />}
        <span className="truncate flex-1">{node.label}</span>
        {!isLeaf && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {node.tokenCount}
          </span>
        )}
      </button>
      {isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TokenTree() {
  const tree = useTokenStore((s) => s.tree);

  if (tree.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground">
        没有找到令牌
      </div>
    );
  }

  return (
    <div className="space-y-0.5 px-1">
      {tree.map((node) => (
        <TreeNode key={node.path} node={node} />
      ))}
    </div>
  );
}

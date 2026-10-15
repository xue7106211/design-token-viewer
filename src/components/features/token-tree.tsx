"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight, Palette, Hash, Type, ToggleLeft, Pencil, CaseSensitive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTokenStore } from "@/stores/token-store";
import type { TokenTreeNode, TokenType } from "@/types/token";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
    case "TYPOGRAPHY":
      return <CaseSensitive className={iconClass} />;
    default:
      return null;
  }
}

function TreeNode({
  node,
  depth = 0,
  onRenameGroup,
}: {
  node: TokenTreeNode;
  depth?: number;
  onRenameGroup?: (path: string) => void;
}) {
  const expandedPaths = useTokenStore((s) => s.expandedPaths);
  const togglePath = useTokenStore((s) => s.togglePath);
  const selectToken = useTokenStore((s) => s.selectToken);
  const scrollToGroup = useTokenStore((s) => s.scrollToGroup);
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);

  const isExpanded = expandedPaths.has(node.path);
  const isLeaf = node.children.length === 0 && node.tokenId !== undefined;
  const isSelected = node.tokenId === selectedTokenId;
  const isGroup = !isLeaf;

  const handleClick = () => {
    if (isLeaf && node.tokenId) {
      selectToken(node.tokenId);
    } else {
      togglePath(node.path);
      scrollToGroup(node.path);
    }
  };

  const row = (
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
  );

  return (
    <div>
      {isGroup && onRenameGroup ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
          <ContextMenuContent className="min-w-[160px]">
            <ContextMenuItem
              className="cursor-pointer"
              onSelect={() => onRenameGroup(node.path)}
            >
              <Pencil className="h-3.5 w-3.5" />
              重命名分组
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        row
      )}
      {isExpanded && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onRenameGroup={onRenameGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TokenTree() {
  const tree = useTokenStore((s) => s.tree);
  const renameGroup = useTokenStore((s) => s.renameGroup);
  const [renameGroupPath, setRenameGroupPath] = useState<string | null>(null);
  const [newPathValue, setNewPathValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameGroupPath !== null) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [renameGroupPath]);

  const handleRenameConfirm = () => {
    if (renameGroupPath === null || !newPathValue.trim()) return;
    if (newPathValue.trim() === renameGroupPath) {
      setRenameGroupPath(null);
      return;
    }
    void renameGroup(renameGroupPath, newPathValue.trim());
    setRenameGroupPath(null);
  };


  if (tree.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted-foreground">
        没有找到令牌
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0.5 px-1">
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            onRenameGroup={(path) => {
              setNewPathValue(path);
              setRenameGroupPath(path);
            }}
          />
        ))}
      </div>
      <Dialog open={renameGroupPath !== null} onOpenChange={(open) => !open && setRenameGroupPath(null)}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle>重命名分组</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              ref={inputRef}
              value={newPathValue}
              onChange={(e) => setNewPathValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameConfirm();
              }}
              placeholder="输入新分组路径，如 color/primary"
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setRenameGroupPath(null)}>
              取消
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!newPathValue.trim()}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

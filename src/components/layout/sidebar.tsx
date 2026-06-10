"use client";

import { useTokenStore } from "@/stores/token-store";
import { SearchBar } from "@/components/features/search-bar";
import { TokenTree } from "@/components/features/token-tree";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { PanelLeftClose, PanelLeftOpen, ChevronsUpDown, ChevronsDownUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChangeLogDialog } from "@/components/features/changelog-dialog";
import { SnapshotDialog } from "@/components/features/snapshot-dialog";
import { DocumentSwitcher } from "@/components/features/document-switcher";
import { useState } from "react";

export function Sidebar() {
  const collections = useTokenStore((s) => s.collections);
  const activeCollectionId = useTokenStore((s) => s.activeCollectionId);
  const setActiveCollection = useTokenStore((s) => s.setActiveCollection);
  const loadRemoteDocument = useTokenStore((s) => s.loadRemoteDocument);
  const expandedPaths = useTokenStore((s) => s.expandedPaths);
  const expandAll = useTokenStore((s) => s.expandAll);
  const collapseAll = useTokenStore((s) => s.collapseAll);
  const [collapsed, setCollapsed] = useState(false);
  const isAllExpanded = expandedPaths.size > 0;

  if (collapsed) {
    return (
      <div className="flex h-full w-10 flex-col items-center border-r bg-sidebar py-2.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground cursor-pointer"
          onClick={() => setCollapsed(false)}
          title="展开侧边栏"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
        <div className="mt-auto">
          <SnapshotDialog collapsed />
          <ChangeLogDialog collapsed />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center h-4 w-[132px] min-w-0 shrink-0 overflow-hidden">
          <img
            src="/hyperos-logo.png"
            alt="HyperOS Token Lib"
            className="h-4 w-auto max-w-full object-contain object-left block"
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setCollapsed(true)}
            title="收起侧边栏"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => void loadRemoteDocument()}
            title="刷新共享数据"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="border-b px-2 py-2">
        <DocumentSwitcher className="w-full" />
      </div>

      {/* Collection Tabs */}
      {collections.length > 1 && (
        <div className="border-b px-2 py-2 space-y-0.5">
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => setActiveCollection(col.id)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs cursor-pointer",
                "transition-colors duration-200 ease",
                activeCollectionId === col.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <span className="truncate">{col.name}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {col.tokenIds.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-2 py-2">
        <SearchBar />
      </div>

      <Separator />

      {/* Token 组标题 + 展开/收起 */}
      <div className="flex items-center justify-between pl-3 pr-2 pt-2 pb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Token 组</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground cursor-pointer"
          onClick={isAllExpanded ? collapseAll : expandAll}
          title={isAllExpanded ? "全部收起" : "全部展开"}
        >
          {isAllExpanded ? (
            <ChevronsDownUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronsUpDown className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Tree: min-h-0 让 flex 子项可收缩，内部才能滚动 */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
          <TokenTree />
        </div>
      </ScrollArea>

      {/* 底部日志入口 */}
      <div className="shrink-0 space-y-1 border-t px-3 py-2">
        <SnapshotDialog />
        <ChangeLogDialog />
      </div>
    </div>
  );
}

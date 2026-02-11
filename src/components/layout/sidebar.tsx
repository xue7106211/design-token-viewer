"use client";

import { useTokenStore } from "@/stores/token-store";
import { SearchBar } from "@/components/features/search-bar";
import { TokenTree } from "@/components/features/token-tree";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const collections = useTokenStore((s) => s.collections);
  const activeCollectionId = useTokenStore((s) => s.activeCollectionId);
  const setActiveCollection = useTokenStore((s) => s.setActiveCollection);
  const clearData = useTokenStore((s) => s.clearData);

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
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
          onClick={clearData}
          title="清除数据"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
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

      {/* Tree: min-h-0 让 flex 子项可收缩，内部才能滚动 */}
      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
          <TokenTree />
        </div>
      </ScrollArea>
    </div>
  );
}

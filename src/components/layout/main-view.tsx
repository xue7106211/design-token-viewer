"use client";

import { useTokenStore } from "@/stores/token-store";
import { TokenGrid } from "@/components/features/token-grid";
import { TokenList } from "@/components/features/token-list";
import { ViewToggle } from "@/components/features/view-toggle";
import { ModeSwitcher } from "@/components/features/mode-switcher";
import { ExportDialog } from "@/components/features/export-dialog";
import { ThemeToggle } from "@/components/features/theme-toggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileJson } from "lucide-react";

export function MainView() {
  const viewMode = useTokenStore((s) => s.viewMode);
  const activeCollection = useTokenStore((s) => s.activeCollection);
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const searchQuery = useTokenStore((s) => s.searchQuery);

  return (
    <div className="flex flex-1 flex-col min-w-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">
              {activeCollection?.name ?? "Design Tokens"}
            </h2>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filteredTokenIds.length} 个令牌
            {searchQuery && " (已过滤)"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ModeSwitcher />
          <ViewToggle />
          <ExportDialog />
          <ThemeToggle />
        </div>
      </div>

      {/* Content: min-h-0 让 flex 子项可收缩，ScrollArea 才能获得固定高度并出现滚动 */}
      <ScrollArea className="min-h-0 flex-1">
        {viewMode === "grid" ? <TokenGrid /> : <TokenList />}
      </ScrollArea>
    </div>
  );
}

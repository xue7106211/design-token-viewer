"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/token-store";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types/token";

export function ViewToggle() {
  const viewMode = useTokenStore((s) => s.viewMode);
  const setViewMode = useTokenStore((s) => s.setViewMode);

  const modes: { value: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { value: "grid", icon: LayoutGrid, label: "网格视图" },
    { value: "list", icon: List, label: "列表视图" },
  ];

  return (
    <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <Button
          key={value}
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 cursor-pointer",
            viewMode === value
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setViewMode(value)}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </Button>
      ))}
    </div>
  );
}

"use client";

import { useTokenStore } from "@/stores/token-store";
import { cn } from "@/lib/utils";

export function ModeSwitcher() {
  const activeCollection = useTokenStore((s) => s.activeCollection);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const setActiveMode = useTokenStore((s) => s.setActiveMode);

  if (!activeCollection || activeCollection.modes.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
      {activeCollection.modes.map((mode) => (
        <button
          key={mode.modeId}
          onClick={() => setActiveMode(mode.modeId)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium cursor-pointer",
            "transition-all duration-200 ease",
            activeModeId === mode.modeId
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}

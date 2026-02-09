"use client";

import { cn } from "@/lib/utils";

interface SpacingPreviewProps {
  value: number;
  className?: string;
}

export function SpacingPreview({ value, className }: SpacingPreviewProps) {
  // Clamp the visual width for display (max 120px)
  const displayWidth = Math.min(value, 120);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex items-center">
        <div
          className="h-6 rounded-sm bg-primary/20 border border-primary/30"
          style={{ width: `${Math.max(displayWidth, 2)}px` }}
        />
        {/* Ruler marks */}
        <div className="absolute -bottom-3 left-0 flex items-end" style={{ width: `${Math.max(displayWidth, 2)}px` }}>
          <div className="h-1.5 w-px bg-primary/50" />
          <div className="flex-1 border-b border-dashed border-primary/30" />
          <div className="h-1.5 w-px bg-primary/50" />
        </div>
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">
        {value}px
      </span>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface NumberPreviewProps {
  value: number;
  name: string;
  className?: string;
}

export function NumberPreview({ value, name, className }: NumberPreviewProps) {
  const lowerName = name.toLowerCase();

  // Detect type from name for appropriate visualization
  if (lowerName.includes("radius")) {
    return <RadiusPreview value={value} className={className} />;
  }

  if (lowerName.includes("spacing") || lowerName.includes("padding") || lowerName.includes("gap")) {
    return <SpacingVisual value={value} className={className} />;
  }

  if (lowerName.includes("font") || lowerName.includes("size")) {
    return <FontSizePreview value={value} className={className} />;
  }

  // Generic number
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-lg font-mono font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted-foreground">px</span>
    </div>
  );
}

function RadiusPreview({ value, className }: { value: number; className?: string }) {
  const displayRadius = Math.min(value, 24);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className="h-10 w-10 border-2 border-primary/40 bg-primary/10"
        style={{ borderRadius: `${displayRadius}px` }}
      />
      <span className="text-xs font-mono text-muted-foreground tabular-nums">
        {value === 9999 ? "full" : `${value}px`}
      </span>
    </div>
  );
}

function SpacingVisual({ value, className }: { value: number; className?: string }) {
  const displayWidth = Math.min(value, 80);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-0">
        <div className="h-8 w-2 rounded-l-sm bg-muted-foreground/20" />
        <div
          className="h-6 bg-primary/15 border-y border-dashed border-primary/30"
          style={{ width: `${Math.max(displayWidth, 2)}px` }}
        />
        <div className="h-8 w-2 rounded-r-sm bg-muted-foreground/20" />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{value}px</span>
    </div>
  );
}

function FontSizePreview({ value, className }: { value: number; className?: string }) {
  const displaySize = Math.min(value, 36);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className="font-semibold text-foreground leading-none"
        style={{ fontSize: `${displaySize}px` }}
      >
        Ag
      </span>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">{value}px</span>
    </div>
  );
}

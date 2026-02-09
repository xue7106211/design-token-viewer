"use client";

import type { ColorValue } from "@/types/token";
import { colorToHex, colorToRGB, contrastRatio } from "@/lib/contrast";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ColorSwatchProps {
  color: ColorValue;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };

export function ColorSwatch({ color, size = "md", showLabel = false, className }: ColorSwatchProps) {
  const hex = colorToHex(color);
  const rgb = colorToRGB(color);
  const ratioOnWhite = contrastRatio(color, WHITE);
  const ratioOnBlack = contrastRatio(color, BLACK);
  const textColor = ratioOnBlack > ratioOnWhite ? "#000" : "#fff";

  const sizeClasses = {
    sm: "h-8 w-8 rounded-md",
    md: "h-12 w-12 rounded-lg",
    lg: "h-20 w-20 rounded-xl",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-2", className)}>
          <div
            className={cn(
              sizeClasses[size],
              "border border-border/50 shadow-sm shrink-0",
              "ring-1 ring-inset ring-black/5"
            )}
            style={{ backgroundColor: hex }}
          >
            {size === "lg" && (
              <span
                className="flex h-full items-center justify-center text-[10px] font-mono font-medium"
                style={{ color: textColor }}
              >
                {hex.toUpperCase()}
              </span>
            )}
          </div>
          {showLabel && (
            <span className="text-xs font-mono text-muted-foreground">{hex.toUpperCase()}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs space-y-0.5">
        <p className="font-mono">{hex.toUpperCase()}</p>
        <p className="font-mono text-muted-foreground">{rgb}</p>
      </TooltipContent>
    </Tooltip>
  );
}

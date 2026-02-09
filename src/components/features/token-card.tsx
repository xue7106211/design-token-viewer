"use client";

import type { DesignToken } from "@/types/token";
import { useTokenStore } from "@/stores/token-store";
import { ColorSwatch } from "./color-swatch";
import { NumberPreview } from "./number-preview";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface TokenCardProps {
  token: DesignToken;
}

export function TokenCard({ token }: TokenCardProps) {
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const selectToken = useTokenStore((s) => s.selectToken);
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);

  const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
  const resolvedValue = token.resolvedValues[modeId];
  const isSelected = selectedTokenId === token.id;

  if (!resolvedValue) return null;

  const shortName = token.path[token.path.length - 1];

  return (
    <button
      onClick={() => selectToken(token.id)}
      className={cn(
        "group flex flex-col items-start gap-3 rounded-xl border p-4 text-left cursor-pointer",
        "transition-all duration-200 ease",
        "hover:shadow-md hover:border-border",
        isSelected
          ? "border-primary/50 bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border/50 bg-card"
      )}
    >
      {/* Preview */}
      <div className="flex w-full items-center justify-between">
        {resolvedValue.type === "COLOR" && (
          <ColorSwatch color={resolvedValue.value} size="lg" />
        )}
        {resolvedValue.type === "NUMBER" && (
          <NumberPreview value={resolvedValue.value} name={token.name} />
        )}
        {resolvedValue.type === "STRING" && (
          <span className="text-sm font-mono truncate max-w-full">{resolvedValue.value}</span>
        )}
        {resolvedValue.type === "BOOLEAN" && (
          <div className={cn(
            "h-6 w-10 rounded-full transition-colors",
            resolvedValue.value ? "bg-green-500" : "bg-muted-foreground/30"
          )}>
            <div className={cn(
              "h-5 w-5 rounded-full bg-white shadow-sm transition-transform mt-0.5",
              resolvedValue.value ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
            )} />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="w-full space-y-1">
        <p className="text-xs font-medium truncate">{shortName}</p>
        <p className="text-[10px] font-mono text-muted-foreground truncate">{token.name}</p>
        {token.isAlias && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <ArrowRight className="h-2.5 w-2.5" />
            <span className="truncate">{token.aliasOf ? useTokenStore.getState().tokens[token.aliasOf]?.name : "alias"}</span>
          </div>
        )}
      </div>
    </button>
  );
}

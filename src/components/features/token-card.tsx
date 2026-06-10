"use client";

import type { DesignToken } from "@/types/token";
import { useTokenStore } from "@/stores/token-store";
import { ColorSwatch } from "./color-swatch";
import { NumberPreview } from "./number-preview";
import { cn } from "@/lib/utils";
import { ArrowRight, Braces, Check, Hash, Link2, Palette, Type } from "lucide-react";

interface TokenCardProps {
  token: DesignToken;
}

export function TokenCard({ token }: TokenCardProps) {
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const activeCollection = useTokenStore((s) => s.activeCollection);
  const tokens = useTokenStore((s) => s.tokens);
  const selectToken = useTokenStore((s) => s.selectToken);
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);

  const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
  const resolvedValue = token.resolvedValues[modeId];
  const isSelected = selectedTokenId === token.id;

  if (!resolvedValue) return null;

  const shortName = token.path[token.path.length - 1];
  const aliasTarget = token.aliasOf ? tokens[token.aliasOf] : undefined;
  const modeCount = Object.keys(token.resolvedValues).length;

  const typeMeta = {
    COLOR: { label: "Color", icon: Palette, className: "text-sky-600 dark:text-sky-400" },
    NUMBER: { label: "Number", icon: Hash, className: "text-violet-600 dark:text-violet-400" },
    STRING: { label: "String", icon: Type, className: "text-amber-600 dark:text-amber-400" },
    BOOLEAN: { label: "Boolean", icon: Check, className: "text-emerald-600 dark:text-emerald-400" },
  }[resolvedValue.type];
  const TypeIcon = typeMeta.icon;

  return (
    <button
      onClick={() => selectToken(token.id)}
      className={cn(
        "group flex min-h-[172px] flex-col items-start overflow-hidden rounded-xl border text-left cursor-pointer",
        "transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out",
        "hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-sm active:translate-y-0 active:scale-[0.99]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected
          ? "border-primary/45 bg-primary/[0.035] shadow-sm ring-1 ring-primary/15"
          : "border-border/60 bg-card"
      )}
    >
      <div className="flex h-24 w-full items-center justify-center border-b bg-muted/25 p-3">
        {resolvedValue.type === "COLOR" && (
          <div className="flex w-full items-center gap-3">
            <ColorSwatch color={resolvedValue.value} size="lg" />
            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="h-2 rounded-full bg-[linear-gradient(90deg,var(--border)_1px,transparent_1px),linear-gradient(var(--border)_1px,transparent_1px)] bg-[size:8px_8px] opacity-50" />
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {resolvedValue.value.a < 1 ? `${Math.round(resolvedValue.value.a * 100)}% alpha` : "solid color"}
              </p>
            </div>
          </div>
        )}
        {resolvedValue.type === "NUMBER" && (
          <div className="w-full rounded-lg border bg-background/70 p-3">
            <NumberPreview value={resolvedValue.value} name={token.name} />
          </div>
        )}
        {resolvedValue.type === "STRING" && (
          <div className="flex w-full items-center gap-2 rounded-lg border bg-background/70 px-3 py-2">
            <Braces className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-mono">{resolvedValue.value}</span>
          </div>
        )}
        {resolvedValue.type === "BOOLEAN" && (
          <div className="flex w-full items-center justify-between rounded-lg border bg-background/70 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Boolean</span>
            <div className={cn(
              "h-6 w-10 rounded-full p-0.5 transition-colors",
              resolvedValue.value ? "bg-emerald-500" : "bg-muted-foreground/25"
            )}>
              <div className={cn(
                "h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150",
                resolvedValue.value && "translate-x-4"
              )} />
            </div>
          </div>
        )}
      </div>

      <div className="flex w-full flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="truncate text-xs font-semibold leading-none">{shortName}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">{token.name}</p>
          </div>
          <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-md border bg-background px-1.5 py-0.5 text-[10px] font-medium", typeMeta.className)}>
            <TypeIcon className="h-3 w-3" />
            {typeMeta.label}
          </span>
        </div>

        <div className="mt-auto flex min-w-0 items-center justify-between gap-2 text-[10px] text-muted-foreground">
          {token.isAlias ? (
            <div className="flex min-w-0 items-center gap-1.5 rounded-md bg-muted/55 px-1.5 py-1">
              <Link2 className="h-3 w-3 shrink-0" />
              <ArrowRight className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate font-mono">{aliasTarget?.name ?? "alias"}</span>
            </div>
          ) : (
            <span className="rounded-md bg-muted/45 px-1.5 py-1">Source token</span>
          )}
          {activeCollection && activeCollection.modes.length > 1 && (
            <span className="shrink-0 rounded-md border bg-background px-1.5 py-1 tabular-nums">
              {modeCount}/{activeCollection.modes.length} modes
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

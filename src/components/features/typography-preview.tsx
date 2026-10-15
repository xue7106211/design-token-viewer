"use client";

import type { DesignToken, TypographyValue } from "@/types/token";
import {
  TYPOGRAPHY_FIELDS,
  fontStyleToWeight,
  formatTypographySize,
  getTypographyFieldAliases,
  isItalicFontStyle,
} from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

/** Figma-like "Ag" sample rendered with the style's family / weight. */
export function TypographySample({
  value,
  className,
  text = "Ag",
}: {
  value: TypographyValue;
  className?: string;
  text?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("leading-none text-foreground", className)}
      style={{
        fontFamily: `"${value.fontFamily}", var(--font-geist-sans), system-ui, sans-serif`,
        fontWeight: fontStyleToWeight(value.fontStyle),
        fontStyle: isItalicFontStyle(value.fontStyle) ? "italic" : undefined,
      }}
    >
      {text}
    </span>
  );
}

/** Compact Figma-style row: Ag + "32/42" + "MiSans · Medium" */
export function TypographyPreview({ value, className }: { value: TypographyValue; className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
        <TypographySample value={value} className="text-lg" />
      </span>
      <div className="min-w-0 space-y-0.5 text-left">
        <p className="truncate font-mono text-sm tabular-nums text-foreground">{formatTypographySize(value)}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {value.fontFamily} · {value.fontStyle}
        </p>
      </div>
    </div>
  );
}

function formatFieldValue(value: string | number | undefined, kind: "STRING" | "NUMBER") {
  if (value === undefined) return "—";
  return kind === "NUMBER" ? `${value}px` : String(value);
}

/**
 * Per-field breakdown of a TYPOGRAPHY token in one mode: resolved value and,
 * when the field aliases another token, that token (clickable when onSelect is given).
 */
export function TypographyFieldList({
  token,
  modeId,
  tokens,
  onSelect,
}: {
  token: DesignToken;
  modeId: string;
  tokens: Record<string, DesignToken>;
  onSelect?: (tokenId: string) => void;
}) {
  const resolved = token.resolvedValues[modeId];
  if (resolved?.type !== "TYPOGRAPHY") return null;
  const aliases = getTypographyFieldAliases(token.rawValues[modeId]);

  return (
    <div className="min-w-0 space-y-1">
      {TYPOGRAPHY_FIELDS.map(({ key, kind, required, label }) => {
        const value = resolved.value[key];
        if (!required && value === undefined) return null;
        const alias = aliases[key];
        const target = alias ? tokens[alias.id] : undefined;
        return (
          <div key={key} className="grid min-w-0 grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2 rounded-md bg-muted/25 px-2 py-1.5">
            <span className="text-[10px] text-muted-foreground">{label}</span>
            <span className="min-w-0 space-y-0.5">
              <span className="block truncate font-mono text-xs text-foreground">{formatFieldValue(value, kind)}</span>
              {alias && (
                <button
                  type="button"
                  disabled={!onSelect || !target}
                  onClick={() => target && onSelect?.(target.id)}
                  title={target?.name ?? alias.id}
                  className={cn(
                    "flex max-w-full items-center gap-1 truncate text-left font-mono text-[10px] text-muted-foreground",
                    onSelect && target && "cursor-pointer hover:text-foreground"
                  )}
                >
                  <Link2 className="h-2.5 w-2.5 shrink-0" />
                  <span className="truncate">{target?.name ?? `${alias.id} (missing)`}</span>
                </button>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

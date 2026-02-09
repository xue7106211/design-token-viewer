"use client";

import { useTokenStore } from "@/stores/token-store";
import { ColorSwatch } from "./color-swatch";
import { colorToHex } from "@/lib/contrast";
import { generateTokenCode } from "@/lib/code-generators";
import { cn } from "@/lib/utils";
import { ArrowRight, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

export function TokenList() {
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const tokens = useTokenStore((s) => s.tokens);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const selectToken = useTokenStore((s) => s.selectToken);
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);
  const codeFormat = useTokenStore((s) => s.codeFormat);

  if (filteredTokenIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-muted-foreground">没有匹配的令牌</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-4 border-b pb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Token Name</span>
        <span>Value</span>
        <span>Code Syntax</span>
        <span>Reference</span>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {filteredTokenIds.map((id) => {
          const token = tokens[id];
          if (!token) return null;
          const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
          const resolved = token.resolvedValues[modeId];
          if (!resolved) return null;

          const code = generateTokenCode(token, codeFormat, modeId);
          const isSelected = selectedTokenId === id;

          return (
            <TokenListRow
              key={id}
              tokenId={id}
              tokenName={token.name}
              resolved={resolved}
              code={code}
              isAlias={token.isAlias}
              aliasName={token.aliasOf ? tokens[token.aliasOf]?.name : undefined}
              isSelected={isSelected}
              onClick={() => selectToken(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function TokenListRow({
  tokenId,
  tokenName,
  resolved,
  code,
  isAlias,
  aliasName,
  isSelected,
  onClick,
}: {
  tokenId: string;
  tokenName: string;
  resolved: { type: string; value: unknown };
  code: string;
  isAlias: boolean;
  aliasName?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [code]
  );

  const valueDisplay = () => {
    if (resolved.type === "COLOR") {
      const color = resolved.value as { r: number; g: number; b: number; a: number };
      return (
        <div className="flex items-center gap-2">
          <ColorSwatch color={color} size="sm" />
          <span className="font-mono text-xs">{colorToHex(color).toUpperCase()}</span>
        </div>
      );
    }
    if (resolved.type === "NUMBER") {
      return <span className="font-mono text-xs">{String(resolved.value)}px</span>;
    }
    return <span className="font-mono text-xs truncate">{String(resolved.value)}</span>;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[2fr_1fr_2fr_1fr] gap-4 items-center px-3 py-2.5 text-left cursor-pointer",
        "transition-colors duration-200 ease",
        "hover:bg-accent/50",
        isSelected && "bg-accent"
      )}
    >
      <span className="text-xs font-mono truncate">{tokenName}</span>
      <div>{valueDisplay()}</div>
      <div className="flex items-center gap-1.5 group/code">
        <code className="text-[11px] font-mono text-muted-foreground truncate flex-1">{code}</code>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover/code:opacity-100 transition-opacity cursor-pointer p-0.5"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {isAlias && aliasName && (
          <span className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{aliasName}</span>
          </span>
        )}
      </div>
    </button>
  );
}

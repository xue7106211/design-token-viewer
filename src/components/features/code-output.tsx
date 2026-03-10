"use client";

import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTokenStore } from "@/stores/token-store";
import { useShikiHtml } from "@/lib/use-shiki";
import type { CodeFormat } from "@/types/token";
import { cn } from "@/lib/utils";

interface CodeOutputProps {
  code: string;
  className?: string;
}

export function CodeOutput({ code, className }: CodeOutputProps) {
  const [copied, setCopied] = useState(false);
  const codeFormat = useTokenStore((s) => s.codeFormat);
  const html = useShikiHtml(code, codeFormat);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div
      className={cn(
        "relative min-w-0 max-w-full w-full rounded-lg border bg-muted/30 overflow-hidden",
        className
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2 border-b px-3 py-1.5">
        <CodeFormatTabs />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 cursor-pointer"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </div>
      {html ? (
        <div
          className="shiki-wrapper min-w-0 w-full overflow-x-auto overflow-y-hidden p-3 text-[11px] font-mono leading-relaxed [&_pre]:!bg-transparent [&_pre]:min-w-0 [&_pre]:overflow-x-auto [&_code]:!bg-transparent [&_code]:break-all [&_code]:whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="min-w-0 w-full overflow-x-auto overflow-y-hidden whitespace-pre-wrap break-all p-3 text-[11px] font-mono leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

function CodeFormatTabs() {
  const codeFormat = useTokenStore((s) => s.codeFormat);
  const setCodeFormat = useTokenStore((s) => s.setCodeFormat);

  const formats: { value: CodeFormat; label: string }[] = [
    { value: "android", label: "Android" },
    { value: "css", label: "CSS" },
  ];

  return (
    <div className="flex items-center gap-1">
      {formats.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => setCodeFormat(value)}
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-medium cursor-pointer",
            "transition-colors duration-200 ease",
            codeFormat === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

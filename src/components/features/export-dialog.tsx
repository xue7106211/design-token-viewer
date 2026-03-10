"use client";

import { useState, useCallback } from "react";
import { Download, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTokenStore } from "@/stores/token-store";
import { generateTokenBlock } from "@/lib/code-generators";
import { useShikiHtml } from "@/lib/use-shiki";
import type { CodeFormat, DesignToken } from "@/types/token";
import { cn } from "@/lib/utils";
import { saveAs } from "file-saver";

export type ExportFormat = CodeFormat | "json";

export function ExportDialog() {
  const tokens = useTokenStore((s) => s.tokens);
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const exportRawJSON = useTokenStore((s) => s.exportRawJSON);
  const [format, setFormat] = useState<ExportFormat>("android");
  const [copied, setCopied] = useState(false);

  const visibleTokens: DesignToken[] = filteredTokenIds
    .map((id) => tokens[id])
    .filter((t): t is DesignToken => t !== undefined);

  const code =
    format === "json"
      ? exportRawJSON()
      : generateTokenBlock(visibleTokens, format, activeModeId ?? undefined, tokens);

  const html = useShikiHtml(code, format);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const ext = format === "json" ? "json" : format === "css" ? "css" : "xml";
    const filename = `design-tokens.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    saveAs(blob, filename);
  }, [code, format]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer">
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">导出</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>导出设计令牌</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">格式：</span>
            <div className="flex items-center gap-1 rounded-lg border bg-muted/50 p-0.5">
              {(["android", "css", "json"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium cursor-pointer transition-all duration-200 ease",
                    format === f
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === "css" ? "CSS" : f === "android" ? "Android XML" : "JSON (原始数据)"}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto">
              {visibleTokens.length} 个令牌
            </span>
          </div>

          {/* Code preview */}
          <div className="relative rounded-lg border bg-muted/30">
            {html ? (
              <div
                className="shiki-wrapper overflow-auto p-4 text-[11px] font-mono leading-relaxed max-h-80 [&_pre]:!bg-transparent [&_code]:!bg-transparent"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="overflow-auto p-4 text-[11px] font-mono leading-relaxed text-foreground/90 max-h-80">
                <code>{code}</code>
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 cursor-pointer"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "已复制" : "复制"}</span>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 cursor-pointer"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              <span>下载文件</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

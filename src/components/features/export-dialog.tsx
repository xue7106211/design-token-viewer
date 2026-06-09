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
import { apiRequest, type SnapshotsResponse } from "@/lib/collaboration/client";
import type { SnapshotRecord } from "@/lib/collaboration/service";

export type ExportFormat = CodeFormat | "json";

export function ExportDialog() {
  const tokens = useTokenStore((s) => s.tokens);
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const exportRawJSON = useTokenStore((s) => s.exportRawJSON);
  const [format, setFormat] = useState<ExportFormat>("android");
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [source, setSource] = useState("current");
  const [remoteCode, setRemoteCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const visibleTokens: DesignToken[] = filteredTokenIds
    .map((id) => tokens[id])
    .filter((t): t is DesignToken => t !== undefined);

  const localCode =
    format === "json"
      ? exportRawJSON()
      : generateTokenBlock(visibleTokens, format, activeModeId ?? undefined, tokens);
  const code = remoteCode ?? localCode;

  const html = useShikiHtml(code, format);

  const loadSnapshots = useCallback(async () => {
    const response = await apiRequest<SnapshotsResponse>("/api/snapshots");
    setSnapshots(response.snapshots);
  }, []);

  const syncExportCode = useCallback(async (nextFormat: ExportFormat, nextSource: string) => {
    if (nextSource === "current") {
      setRemoteCode(null);
      return;
    }
    const params = new URLSearchParams({ format: nextFormat });
    if (activeModeId) params.set("modeId", activeModeId);
    params.set("snapshotId", nextSource);
    setIsGenerating(true);
    try {
      const response = await apiRequest<{ code: string }>(`/api/export?${params.toString()}`);
      setRemoteCode(response.code);
    } catch {
      setRemoteCode(localCode);
    } finally {
      setIsGenerating(false);
    }
  }, [activeModeId, localCode]);

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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          void loadSnapshots();
          void syncExportCode(format, source);
        }
      }}
    >
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
                  onClick={() => {
                    setFormat(f);
                    void syncExportCode(f, source);
                  }}
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">来源：</span>
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                void syncExportCode(format, event.target.value);
              }}
              className="h-8 rounded-md border bg-background px-2 text-xs"
            >
              <option value="current">当前 Token 表</option>
              {snapshots.map((snapshot) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {snapshot.name}
                </option>
              ))}
            </select>
            {isGenerating && (
              <span className="text-xs text-muted-foreground">正在生成...</span>
            )}
          </div>

          {/* Code preview */}
          <div className="relative min-w-0 w-full rounded-lg border bg-muted/30 overflow-hidden">
            {html ? (
              <div
                className="shiki-wrapper min-w-0 w-full overflow-x-auto overflow-y-auto p-4 text-[11px] font-mono leading-relaxed max-h-80 [&_pre]:!bg-transparent [&_pre]:min-w-0 [&_code]:!bg-transparent [&_code]:break-all [&_code]:whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="min-w-0 w-full overflow-x-auto overflow-y-auto whitespace-pre-wrap break-all p-4 text-[11px] font-mono leading-relaxed text-foreground/90 max-h-80">
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

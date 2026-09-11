"use client";

import { useState, useCallback } from "react";
import { Download, Copy, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTokenStore } from "@/stores/token-store";
import { generateTokenBlock } from "@/lib/code-generators";
import { rebuildRawJSON } from "@/lib/token-rebuilder";
import { useShikiHtml } from "@/lib/use-shiki";
import type { CodeFormat, DesignToken, TokenCollection } from "@/types/token";
import { cn } from "@/lib/utils";
import { saveAs } from "file-saver";
import { apiRequest, type SnapshotsResponse } from "@/lib/collaboration/client";
import type { SnapshotRecord } from "@/lib/collaboration/service";

export type ExportFormat = CodeFormat | "json";

function rebuildExportJSON(tokens: DesignToken[], collection: TokenCollection | null): string {
  const tokenMap = Object.fromEntries(tokens.map((token) => [token.id, token]));
  const collections = collection
    ? [{ ...collection, tokenIds: collection.tokenIds.filter((id) => tokenMap[id] != null) }]
    : [];

  return JSON.stringify(rebuildRawJSON(collections, tokenMap), null, 2);
}

function getSourceLabel(source: string, snapshots: SnapshotRecord[]): string {
  if (source === "all") return "全部 Token 表";
  if (source === "current") return "当前 Token 表";

  return snapshots.find((snapshot) => snapshot.id === source)?.name ?? "当前 Token 表";
}

function getJSONExportCode(
  source: string,
  tokens: DesignToken[],
  collection: TokenCollection | null,
  exportRawJSON: () => string
): string {
  if (source === "all") return exportRawJSON();

  return rebuildExportJSON(tokens, collection);
}

function getExportFileExtension(format: ExportFormat): "json" | "css" | "xml" {
  if (format === "json") return "json";
  if (format === "css") return "css";

  return "xml";
}

export function ExportDialog() {
  const tokens = useTokenStore((s) => s.tokens);
  const collections = useTokenStore((s) => s.collections);
  const activeCollection = useTokenStore((s) => s.activeCollection);
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
  const allTokens: DesignToken[] = collections
    .flatMap((collection) => collection.tokenIds)
    .map((id) => tokens[id])
    .filter((t): t is DesignToken => t !== undefined);
  const sourceTokens = source === "all" ? allTokens : visibleTokens;
  const sourceLabel = getSourceLabel(source, snapshots);

  const localCode =
    format === "json"
      ? getJSONExportCode(source, sourceTokens, activeCollection, exportRawJSON)
      : generateTokenBlock(sourceTokens, format, activeModeId ?? undefined, tokens);
  const code = remoteCode ?? localCode;

  const html = useShikiHtml(code, format);

  const loadSnapshots = useCallback(async () => {
    const response = await apiRequest<SnapshotsResponse>("/api/snapshots");
    setSnapshots(response.snapshots);
  }, []);

  const syncExportCode = useCallback(async (nextFormat: ExportFormat, nextSource: string) => {
    if (nextSource === "current" || nextSource === "all") {
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

  const handleSourceChange = useCallback((nextSource: string) => {
    setSource(nextSource);
    void syncExportCode(format, nextSource);
  }, [format, syncExportCode]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const ext = getExportFileExtension(format);
    const filename = `design-tokens${source === "all" ? "-all" : ""}.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    saveAs(blob, filename);
  }, [code, format, source]);

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
        <Button
          variant="outline"
          size="sm"
          className="cursor-pointer active:scale-[0.96]"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">导出</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:h-[min(90dvh,54rem)] sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4 sm:px-6">
          <DialogTitle className="pr-8">导出设计令牌</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5 sm:p-6">
          <div className="flex shrink-0 flex-col gap-3 rounded-xl bg-muted/30 p-3 shadow-[var(--elevation-raised)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">格式：</span>
              <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border bg-muted/50 p-0.5">
                {(["android", "css", "json"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFormat(f);
                      void syncExportCode(f, source);
                    }}
                    className={cn(
                      "shrink-0 rounded-md px-3 py-1 text-xs font-medium cursor-pointer transition-[color,background-color,box-shadow,transform] duration-150 ease-out active:scale-[0.96]",
                      format === f
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f === "css" ? "CSS" : f === "android" ? "Android XML" : "JSON (原始数据)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
              <span className="text-xs text-muted-foreground">来源：</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-w-32 justify-between gap-2 px-2.5 text-xs font-normal active:scale-[0.96]"
                    aria-label="选择导出来源"
                  >
                    <span className="truncate">{sourceLabel}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                    导出范围
                  </DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={source} onValueChange={handleSourceChange}>
                    <DropdownMenuRadioItem value="current" className="cursor-pointer text-xs">
                      当前 Token 表
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="all" className="cursor-pointer text-xs">
                      全部 Token 表
                    </DropdownMenuRadioItem>
                    {snapshots.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          版本快照
                        </DropdownMenuLabel>
                        {snapshots.map((snapshot) => (
                          <DropdownMenuRadioItem key={snapshot.id} value={snapshot.id} className="max-w-64 cursor-pointer text-xs">
                            <span className="truncate">{snapshot.name}</span>
                          </DropdownMenuRadioItem>
                        ))}
                      </>
                    )}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              {isGenerating && (
                <span className="text-xs text-muted-foreground">正在生成...</span>
              )}
              <span className="whitespace-nowrap rounded-md bg-background px-2 py-1 text-xs font-mono tabular-nums text-muted-foreground" data-testid="export-token-count">
                {sourceTokens.length} 个令牌
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-muted/30">
            <div className="flex shrink-0 items-center justify-between border-b bg-background/60 px-3 py-2">
              <span className="text-xs font-medium">代码预览</span>
              <span className="text-[11px] text-muted-foreground">可横向滚动查看完整代码</span>
            </div>
            {html ? (
              <div
                className="shiki-wrapper min-h-0 flex-1 overflow-auto p-4 text-[11px] font-mono leading-relaxed [&_pre]:!w-max [&_pre]:!min-w-max [&_pre]:!bg-transparent [&_code]:!bg-transparent [&_code]:!whitespace-pre"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <pre className="min-h-0 flex-1 overflow-auto whitespace-pre p-4 text-[11px] font-mono leading-relaxed text-foreground/90">
                <code>{code}</code>
              </pre>
            )}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 cursor-pointer active:scale-[0.96]"
              onClick={handleCopy}
            >
              <span className="relative flex h-3.5 w-3.5 items-center justify-center" aria-hidden="true">
                <Copy
                  className={cn(
                    "absolute h-3.5 w-3.5 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                    copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
                  )}
                />
                <Check
                  className={cn(
                    "absolute h-3.5 w-3.5 text-green-500 transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.2,0,0,1)]",
                    copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
                  )}
                />
              </span>
              <span>{copied ? "已复制" : "复制"}</span>
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 cursor-pointer active:scale-[0.96]"
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

"use client";

import { useEffect, useState, useMemo } from "react";
import { History } from "lucide-react";
import { colord } from "colord";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChangeLogStore } from "@/stores/changelog-store";
import { useTokenStore } from "@/stores/token-store";
import { getChangeTypeLabel, formatTimestamp } from "@/lib/changelog";
import { colorToHex } from "@/lib/contrast";
import type { LogEntry, ChangeType } from "@/types/changelog";
import type { ColorValue } from "@/types/token";

const MAX_INLINE_VALUE_LENGTH = 160;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 判断一个 unknown 值是否为 ColorValue 对象 (r/g/b/a 0-1) */
function isColorValue(v: unknown): v is ColorValue {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.r === "number" &&
    typeof obj.g === "number" &&
    typeof obj.b === "number" &&
    typeof obj.a === "number"
  );
}

/** 尝试将 unknown 值转为可展示的颜色 hex，无法识别则返回 null */
function tryResolveColor(v: unknown): string | null {
  if (isColorValue(v)) return colorToHex(v);
  if (typeof v === "string") {
    const c = colord(v);
    if (c.isValid()) return c.toHex();
  }
  return null;
}

/** 将 unknown 值转为可展示的字符串 */
function valueToString(v: unknown): string {
  if (v === undefined || v === null) return "—";
  if (typeof v === "string") return v || "（空）";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFullTokenDocument(v: unknown): v is { collections: unknown[]; variables: Record<string, unknown> } {
  return isRecord(v) && Array.isArray(v.collections) && isRecord(v.variables);
}

function documentSummary(v: unknown, fallbackLabel: string): string | null {
  if (isRecord(v) && typeof v.label === "string") {
    const parts = [v.label];
    if (typeof v.collections === "number") parts.push(`${v.collections} collections`);
    if (typeof v.tokens === "number") parts.push(`${v.tokens} tokens`);
    return parts.join(" · ");
  }

  if (!isFullTokenDocument(v)) return null;
  const variables = v.variables as Record<string, unknown>;
  return `${fallbackLabel} · ${v.collections.length} collections · ${Object.keys(variables).length} tokens`;
}

function aliasLabel(v: unknown): string | null {
  if (!isRecord(v) || v.type !== "ALIAS" || typeof v.id !== "string") return null;
  return `别名 ${v.id}`;
}

function compactValueToString(v: unknown, fallbackLabel: string): string {
  const alias = aliasLabel(v);
  if (alias) return alias;
  const summary = documentSummary(v, fallbackLabel);
  if (summary) return summary;

  const value = valueToString(v);
  return value.length > MAX_INLINE_VALUE_LENGTH
    ? `${value.slice(0, MAX_INLINE_VALUE_LENGTH)}…`
    : value;
}

/** ChangeType 对应的 badge 颜色 */
function typeBadgeClass(type: ChangeType): string {
  switch (type) {
    case "delete_token":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "update_value":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "update_name":
    case "rename_group":
    case "move_tokens_to_group":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

// ---------------------------------------------------------------------------
// 颜色色块小组件
// ---------------------------------------------------------------------------

function readMovePairs(oldValue: unknown, newValue: unknown) {
  if (!Array.isArray(oldValue)) return [];
  return oldValue.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.tokenId !== "string" || typeof item.name !== "string") return [];
    const next = Array.isArray(newValue) ? newValue[index] : undefined;
    const newName = isRecord(next) && typeof next.name === "string" ? next.name : item.name;
    return [{ tokenId: item.tokenId, oldName: item.name, newName }];
  });
}

function ModeLabel({ modeId }: { modeId?: string }) {
  const modeName = useTokenStore((state) => {
    if (!modeId) return null;
    for (const collection of state.collections) {
      const mode = collection.modes.find((item) => item.modeId === modeId);
      if (mode) return mode.name;
    }
    return modeId;
  });
  if (!modeName) return null;
  return <span className="text-xs text-muted-foreground">模式 {modeName}</span>;
}

function DiffSide({
  value,
  tone,
  allowColor,
}: {
  value: unknown;
  tone: "old" | "new";
  allowColor: boolean;
}) {
  const color = allowColor ? tryResolveColor(value) : null;
  const textClass =
    tone === "old"
      ? "rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400 break-words"
      : "rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400 break-words";
  if (!color) {
    return <span className={textClass}>{compactValueToString(value, tone === "old" ? "修改前" : "修改后")}</span>;
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
        tone === "old" ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"
      }`}
    >
      <MiniColorSwatch hex={color} />
      <span className={`font-mono ${tone === "old" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
        {color.toUpperCase()}
      </span>
    </span>
  );
}

function MiniColorSwatch({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block h-4 w-4 rounded border border-border/50 align-middle shrink-0"
      style={{ backgroundColor: hex }}
    />
  );
}

// ---------------------------------------------------------------------------
// ValueDiff — 前后对比渲染
// ---------------------------------------------------------------------------

function ValueDiff({ entry }: { entry: LogEntry }) {
  const { changeType, oldValue, newValue, meta } = entry;

  // 删除操作：展示被删除 Token 的名称和类型
  if (changeType === "delete_token") {
    const tokenType = (meta?.type as string) ?? (oldValue as Record<string, unknown>)?.type;
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-red-600 dark:text-red-400 line-through">
          {entry.tokenName ?? "未知令牌"}
        </span>
        {tokenType && (
          <span className="text-muted-foreground">({String(tokenType)})</span>
        )}
      </div>
    );
  }

  // 重排序：简要展示
  if (changeType === "reorder") {
    return (
      <span className="text-xs text-muted-foreground">
        令牌顺序已调整
        {typeof meta?.collectionName === "string" ? ` · ${meta.collectionName}` : ""}
        {typeof meta?.count === "number" ? ` · ${meta.count} tokens` : ""}
      </span>
    );
  }

  if (changeType === "rename_group") {
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {compactValueToString(oldValue, "原分组")}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400">
          {compactValueToString(newValue, "新分组")}
        </span>
        {typeof meta?.count === "number" && (
          <span className="text-muted-foreground">影响 {meta.count} tokens</span>
        )}
      </div>
    );
  }

  if (changeType === "move_tokens_to_group") {
    const pairs = readMovePairs(oldValue, newValue);
    const visiblePairs = pairs.slice(0, 8);
    return (
      <div className="space-y-1.5">
        <span className="text-xs text-muted-foreground">
          已移动 {typeof meta?.count === "number" ? `${meta.count} 个 ` : ""}Token 至 {String(meta?.targetGroup ?? "(root)")}
        </span>
        {visiblePairs.length > 0 && (
          <div className="space-y-1">
            {visiblePairs.map((pair) => (
              <div key={pair.tokenId} className="flex items-center gap-2 text-xs flex-wrap">
                <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  {pair.oldName}
                </span>
                <span className="text-muted-foreground">→</span>
                <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400">
                  {pair.newName}
                </span>
              </div>
            ))}
            {pairs.length > visiblePairs.length && (
              <span className="text-xs text-muted-foreground">另有 {pairs.length - visiblePairs.length} 个</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (changeType === "import_document") {
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {compactValueToString(oldValue, "原文档")}
        </span>
        <span className="text-muted-foreground">→</span>
        <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400">
          {compactValueToString(newValue, "导入文档")}
        </span>
      </div>
    );
  }

  if (changeType === "restore_snapshot" || changeType === "create_snapshot") {
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {oldValue !== undefined && (
          <>
            <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {compactValueToString(oldValue, "恢复前文档")}
            </span>
            <span className="text-muted-foreground">→</span>
          </>
        )}
        <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400">
          {compactValueToString(newValue, "快照")}
        </span>
      </div>
    );
  }

  if (changeType === "update_value" || changeType === "set_alias") {
    return (
      <div className="space-y-1.5">
        <ModeLabel modeId={typeof meta?.modeId === "string" ? meta.modeId : undefined} />
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <DiffSide value={oldValue} tone="old" allowColor />
          <span className="text-muted-foreground">→</span>
          <DiffSide value={newValue} tone="new" allowColor />
        </div>
      </div>
    );
  }

  const oldStr = compactValueToString(oldValue, "修改前");
  const newStr = compactValueToString(newValue, "修改后");

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400 break-words">
        {oldStr}
      </span>
      <span className="text-muted-foreground">→</span>
      <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400 break-words">
        {newStr}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 单条日志卡片
// ---------------------------------------------------------------------------

function LogEntryCard({ entry }: { entry: LogEntry }) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1.5">
      {/* 头部：时间 + IP + 类型标签 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono">
          {formatTimestamp(entry.timestamp)}
        </span>
        <span className="text-xs text-muted-foreground">
          IP: {entry.ip}
        </span>
        {entry.actorName && (
          <span className="text-xs text-muted-foreground">
            by {entry.actorName}
          </span>
        )}
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeClass(entry.changeType)}`}
        >
          {getChangeTypeLabel(entry.changeType)}
        </span>
      </div>

      {/* Token 名称 */}
      {entry.tokenName && (
        <div className="text-sm font-medium truncate">{entry.tokenName}</div>
      )}

      {/* 值对比 */}
      <ValueDiff entry={entry} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ChangeLogDialog — 主组件
// ---------------------------------------------------------------------------

export function ChangeLogDialog({ collapsed = false }: { collapsed?: boolean }) {
  const entries = useChangeLogStore((s) => s.entries);
  const total = useChangeLogStore((s) => s.total);
  const fetchEntries = useChangeLogStore((s) => s.fetchEntries);
  const isLoading = useChangeLogStore((s) => s.isLoading);
  const error = useChangeLogStore((s) => s.error);
  const updatedAt = useTokenStore((s) => s.updatedAt);
  const updatedBy = useTokenStore((s) => s.updatedBy);
  const activeDocumentId = useTokenStore((s) => s.activeDocumentId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || typeof fetchEntries !== "function") return;
    void fetchEntries();
  }, [open, activeDocumentId, fetchEntries]);

  // 按时间倒序（最新在前）
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.timestamp - a.timestamp),
    [entries]
  );

  const countLabel = isLoading && entries.length === 0
    ? "正在加载..."
    : total > entries.length
      ? `共 ${total} 条记录，显示最新 ${entries.length} 条`
      : `共 ${total} 条记录`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground cursor-pointer"
            title="日志"
          >
            <History className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
            <History className="h-3.5 w-3.5" />
            <span className="text-xs">日志</span>
            {total > 0 && (
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{total}</span>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex h-[85dvh] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>修改日志</DialogTitle>
          <DialogDescription className="sr-only">
            查看所有 Token 变更记录
          </DialogDescription>
        </DialogHeader>

        {/* 工具栏 */}
        <div className="flex shrink-0 items-start justify-between gap-3">
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div>{countLabel}</div>
            {updatedAt && (
              <div className="text-[11px]">
                最近更新：{formatTimestamp(updatedAt)}{updatedBy ? ` · ${updatedBy}` : ""}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => void fetchEntries()}>
              重试
            </Button>
          </div>
        )}

        {/* 日志列表 */}
        {sortedEntries.length > 0 ? (
          <ScrollArea data-testid="change-log-list" className="-mx-6 min-h-0 flex-1 px-6">
            <div className="space-y-2 pb-2">
              {sortedEntries.map((entry) => (
                <LogEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        ) : error ? null : (
          <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
            {isLoading ? "正在加载..." : "暂无日志记录"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

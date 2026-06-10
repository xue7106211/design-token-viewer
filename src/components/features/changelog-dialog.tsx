"use client";

import { useState, useMemo } from "react";
import { History, Trash2 } from "lucide-react";
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

/** ChangeType 对应的 badge 颜色 */
function typeBadgeClass(type: ChangeType): string {
  switch (type) {
    case "delete_token":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "update_value":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "update_name":
    case "rename_group":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

// ---------------------------------------------------------------------------
// 颜色色块小组件
// ---------------------------------------------------------------------------

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
      <span className="text-xs text-muted-foreground">令牌顺序已调整</span>
    );
  }

  // 颜色类型检测
  const oldColor = tryResolveColor(oldValue);
  const newColor = tryResolveColor(newValue);
  const isColor = oldColor !== null || newColor !== null;

  if (isColor) {
    return (
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {oldColor !== null && (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5 dark:bg-red-900/20">
            <MiniColorSwatch hex={oldColor} />
            <span className="font-mono text-red-600 dark:text-red-400">
              {oldColor.toUpperCase()}
            </span>
          </span>
        )}
        <span className="text-muted-foreground">→</span>
        {newColor !== null && (
          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 dark:bg-green-900/20">
            <MiniColorSwatch hex={newColor} />
            <span className="font-mono text-green-600 dark:text-green-400">
              {newColor.toUpperCase()}
            </span>
          </span>
        )}
      </div>
    );
  }

  // 通用文本对比
  const oldStr = valueToString(oldValue);
  const newStr = valueToString(newValue);

  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-red-600 dark:bg-red-900/20 dark:text-red-400 break-all">
        {oldStr}
      </span>
      <span className="text-muted-foreground">→</span>
      <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-green-600 dark:bg-green-900/20 dark:text-green-400 break-all">
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
  const clearAll = useChangeLogStore((s) => s.clearAll);
  const fetchEntries = useChangeLogStore((s) => s.fetchEntries);
  const isLoading = useChangeLogStore((s) => s.isLoading);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const updatedAt = useTokenStore((s) => s.updatedAt);
  const updatedBy = useTokenStore((s) => s.updatedBy);
  const [open, setOpen] = useState(false);

  // 按时间倒序（最新在前）
  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.timestamp - a.timestamp),
    [entries]
  );

  const handleClear = () => {
    clearAll();
    setConfirmOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && typeof fetchEntries === "function") void fetchEntries();
      }}
    >
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
            {entries.length > 0 && (
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{entries.length}</span>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>修改日志</DialogTitle>
          <DialogDescription className="sr-only">
            查看所有 Token 变更记录
          </DialogDescription>
        </DialogHeader>

        {/* 工具栏 */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 text-xs text-muted-foreground">
            <div>{isLoading ? "正在加载..." : `共 ${entries.length} 条记录`}</div>
            {updatedAt && (
              <div className="text-[11px]">
                最近更新：{formatTimestamp(updatedAt)}{updatedBy ? ` · ${updatedBy}` : ""}
              </div>
            )}
          </div>
          {entries.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive cursor-pointer"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-xs">清空日志</span>
            </Button>
          )}
        </div>

        {/* 日志列表 */}
        {sortedEntries.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
            暂无日志记录
          </div>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "calc(85vh - 160px)" }}>
            <div className="space-y-2 pb-2">
              {sortedEntries.map((entry) => (
                <LogEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        )}

        {/* 清空确认对话框 */}
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-sm" showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>确认清空</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                此操作将删除所有日志记录且无法恢复，确定要继续吗？
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setConfirmOpen(false)}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="cursor-pointer"
                onClick={handleClear}
              >
                确认清空
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

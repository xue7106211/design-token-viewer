"use client";

import { useEffect, useState, useMemo } from "react";
import { ChevronRight, History } from "lucide-react";
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
import { useChangeLogStore } from "@/stores/changelog-store";
import { useTokenStore } from "@/stores/token-store";
import { getChangeTypeLabel, formatTimestamp } from "@/lib/changelog";
import { colorToHex } from "@/lib/contrast";
import type { LogEntry } from "@/types/changelog";
import type { ColorValue } from "@/types/token";
import { cn } from "@/lib/utils";

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
  if (!isRecord(v) || v.type !== "ALIAS") return null;
  if (typeof v.name === "string") return `→ ${v.name}`;
  if (typeof v.id === "string") return `别名 ${v.id}`;
  return null;
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

function documentCounts(v: unknown): { collections: number; tokens: number } | null {
  if (isRecord(v) && typeof v.collections === "number" && typeof v.tokens === "number") {
    return { collections: v.collections, tokens: v.tokens };
  }
  if (!isFullTokenDocument(v)) return null;
  return { collections: v.collections.length, tokens: Object.keys(v.variables).length };
}

function snapshotName(v: unknown): string | null {
  return isRecord(v) && typeof v.name === "string" ? v.name : null;
}

/** IPv4-mapped IPv6（::ffff:1.2.3.4）显示为 IPv4 */
function displayIP(ip: string): string {
  return ip.replace(/^::ffff:/i, "");
}

interface ImportChanges {
  counts: { added: number; removed: number; changed: number };
  added: string[];
  removed: string[];
  changed: { name: string; values: { mode: string; before: unknown; after: unknown }[]; fields: string[] }[];
}

function readImportChanges(meta: Record<string, unknown> | undefined): ImportChanges | null {
  const c = meta?.changes;
  if (isRecord(c) && isRecord(c.counts) && Array.isArray(c.added) && Array.isArray(c.removed) && Array.isArray(c.changed)) {
    return c as unknown as ImportChanges;
  }
  // 旧版 --db 同步只在 meta 顶层存了三组名称
  const names = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null);
  const added = names(meta?.added);
  const removed = names(meta?.removed);
  const changed = names(meta?.changed);
  if (!added || !removed || !changed) return null;
  return {
    counts: { added: added.length, removed: removed.length, changed: changed.length },
    added,
    removed,
    changed: changed.map((name) => ({ name, values: [], fields: [] })),
  };
}

const FIELD_LABELS: Record<string, string> = {
  type: "类型",
  description: "描述",
  scopes: "Scope",
  codeSyntax: "codeSyntax",
};

function signed(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}

function readMovePairs(oldValue: unknown, newValue: unknown) {
  if (!Array.isArray(oldValue)) return [];
  return oldValue.flatMap((item, index) => {
    if (!isRecord(item) || typeof item.tokenId !== "string" || typeof item.name !== "string") return [];
    const next = Array.isArray(newValue) ? newValue[index] : undefined;
    const newName = isRecord(next) && typeof next.name === "string" ? next.name : item.name;
    return [{ tokenId: item.tokenId, oldName: item.name, newName }];
  });
}

// ---------------------------------------------------------------------------
// 前后值展示：旧值弱化并加删除线，新值用正文色
// ---------------------------------------------------------------------------

const OLD_VALUE_CLASS =
  "font-mono text-muted-foreground line-through decoration-muted-foreground/40 [overflow-wrap:anywhere]";
const NEW_VALUE_CLASS = "font-mono text-foreground [overflow-wrap:anywhere]";

function Arrow() {
  return <span className="shrink-0 text-muted-foreground" aria-hidden="true">→</span>;
}

function OldNew({ oldText, newText }: { oldText: string; newText: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className={OLD_VALUE_CLASS}>{oldText}</span>
      <Arrow />
      <span className={NEW_VALUE_CLASS}>{newText}</span>
    </div>
  );
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

function DiffSide({ value, tone }: { value: unknown; tone: "old" | "new" }) {
  const color = tryResolveColor(value);
  const textClass = tone === "old" ? OLD_VALUE_CLASS : NEW_VALUE_CLASS;
  if (!color) {
    return <span className={textClass}>{compactValueToString(value, tone === "old" ? "修改前" : "修改后")}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <MiniColorSwatch hex={color} />
      <span className={textClass}>{color.toUpperCase()}</span>
    </span>
  );
}

function MiniColorSwatch({ hex }: { hex: string }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-[4px] border border-foreground/10 align-middle"
      style={{ backgroundColor: hex }}
    />
  );
}

// ---------------------------------------------------------------------------
// 导入明细：新增 / 删除 / 修改，默认折叠
// ---------------------------------------------------------------------------

function ChangeGroup({
  label,
  count,
  shown,
  children,
}: {
  label: string;
  count: number;
  shown: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" aria-hidden="true" />
        {label} <span className="font-mono tabular-nums">{count}</span>
      </summary>
      <div className="mt-1 max-h-64 space-y-1 overflow-y-auto border-l pl-3">
        {children}
        {count > shown && (
          <span className="block text-muted-foreground">另有 {count - shown} 个未记录明细</span>
        )}
      </div>
    </details>
  );
}

function ImportChangeList({ changes }: { changes: ImportChanges }) {
  const { counts } = changes;
  if (counts.added + counts.removed + counts.changed === 0) {
    return <span className="text-xs text-muted-foreground">没有 Token 变化</span>;
  }
  return (
    <div className="flex flex-col gap-1 text-xs">
      <ChangeGroup label="新增" count={counts.added} shown={changes.added.length}>
        {changes.added.map((name) => (
          <span key={name} className={cn("block", NEW_VALUE_CLASS)}>{name}</span>
        ))}
      </ChangeGroup>
      <ChangeGroup label="删除" count={counts.removed} shown={changes.removed.length}>
        {changes.removed.map((name) => (
          <span key={name} className={cn("block", OLD_VALUE_CLASS)}>{name}</span>
        ))}
      </ChangeGroup>
      <ChangeGroup label="修改" count={counts.changed} shown={changes.changed.length}>
        {changes.changed.map((item) => (
          <div key={item.name} className="space-y-0.5">
            <span className="block font-mono text-foreground [overflow-wrap:anywhere]">{item.name}</span>
            {item.values.map((v) => (
              <div key={v.mode} className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-3">
                <span className="text-muted-foreground">{v.mode}</span>
                <DiffSide value={v.before} tone="old" />
                <Arrow />
                <DiffSide value={v.after} tone="new" />
              </div>
            ))}
            {item.fields.length > 0 && (
              <span className="block pl-3 text-muted-foreground">
                {item.fields.map((f) => FIELD_LABELS[f] ?? f).join("、")} 有变化
              </span>
            )}
          </div>
        ))}
      </ChangeGroup>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ValueDiff — 前后对比渲染
// ---------------------------------------------------------------------------

function ValueDiff({ entry }: { entry: LogEntry }) {
  const { changeType, oldValue, newValue, meta } = entry;

  if (changeType === "delete_token") {
    const tokenType = (meta?.type as string) ?? (oldValue as Record<string, unknown>)?.type;
    return tokenType ? (
      <span className="text-xs text-muted-foreground">类型 {String(tokenType)}</span>
    ) : null;
  }

  if (changeType === "reorder") {
    return (
      <span className="text-xs text-muted-foreground">
        Token 顺序已调整
        {typeof meta?.collectionName === "string" ? ` · ${meta.collectionName}` : ""}
        {typeof meta?.count === "number" ? ` · ${meta.count} tokens` : ""}
      </span>
    );
  }

  if (changeType === "rename_group") {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={OLD_VALUE_CLASS}>{compactValueToString(oldValue, "原分组")}</span>
        <Arrow />
        <span className={NEW_VALUE_CLASS}>{compactValueToString(newValue, "新分组")}</span>
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
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">
          已移动 {typeof meta?.count === "number" ? `${meta.count} 个 ` : ""}Token 至 {String(meta?.targetGroup ?? "(root)")}
        </span>
        {visiblePairs.map((pair) => (
          <OldNew key={pair.tokenId} oldText={pair.oldName} newText={pair.newName} />
        ))}
        {pairs.length > visiblePairs.length && (
          <span className="block text-xs text-muted-foreground">另有 {pairs.length - visiblePairs.length} 个</span>
        )}
      </div>
    );
  }

  if (changeType === "import_document") {
    const before = documentCounts(oldValue);
    const after = documentCounts(newValue);
    if (!before || !after) {
      return (
        <OldNew
          oldText={compactValueToString(oldValue, "原文档")}
          newText={compactValueToString(newValue, "导入文档")}
        />
      );
    }
    const delta = after.tokens - before.tokens;
    const changes = readImportChanges(meta);
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
          <span className="font-mono text-foreground">
            {before.tokens} → {after.tokens} tokens
          </span>
          {delta !== 0 && <span className="font-mono text-muted-foreground">{signed(delta)}</span>}
          <span className="text-muted-foreground">
            {before.collections === after.collections
              ? `${after.collections} collections`
              : `${before.collections} → ${after.collections} collections`}
          </span>
        </div>
        {changes && <ImportChangeList changes={changes} />}
      </div>
    );
  }

  if (changeType === "restore_snapshot" || changeType === "create_snapshot") {
    const name = snapshotName(newValue);
    const before = changeType === "restore_snapshot" ? documentCounts(oldValue) : null;
    const after = changeType === "restore_snapshot" ? documentCounts(newValue) : null;
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-foreground [overflow-wrap:anywhere]">
          {name ?? compactValueToString(newValue, "快照")}
        </span>
        {before && after ? (
          <span className="font-mono tabular-nums text-muted-foreground">
            {before.tokens} → {after.tokens} tokens
          </span>
        ) : before ? (
          <span className="font-mono tabular-nums text-muted-foreground">
            恢复前 {before.tokens} tokens
          </span>
        ) : null}
      </div>
    );
  }

  if (changeType === "update_value" || changeType === "set_alias") {
    return (
      <div className="space-y-1">
        <ModeLabel modeId={typeof meta?.modeId === "string" ? meta.modeId : undefined} />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <DiffSide value={oldValue} tone="old" />
          <Arrow />
          <DiffSide value={newValue} tone="new" />
        </div>
      </div>
    );
  }

  return (
    <OldNew
      oldText={compactValueToString(oldValue, "修改前")}
      newText={compactValueToString(newValue, "修改后")}
    />
  );
}

// ---------------------------------------------------------------------------
// 单条日志
// ---------------------------------------------------------------------------

function LogEntryRow({ entry, time }: { entry: LogEntry; time: string }) {
  const isDelete = entry.changeType === "delete_token";
  const tokenLabel = entry.tokenName ?? (isDelete ? "未知 Token" : null);
  return (
    <li className="flex gap-4 px-4 py-3 transition-colors hover:bg-muted/40">
      <time
        className="w-16 shrink-0 pt-px font-mono text-[11px] tabular-nums text-muted-foreground"
        dateTime={new Date(entry.timestamp).toISOString()}
      >
        {time}
      </time>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-baseline gap-3">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <span
              className={cn(
                "shrink-0 text-xs font-medium",
                isDelete ? "text-destructive" : "text-foreground"
              )}
            >
              {getChangeTypeLabel(entry.changeType)}
            </span>
            {tokenLabel && (
              <span
                className={cn(
                  "truncate font-mono text-xs",
                  isDelete ? "text-muted-foreground line-through" : "text-foreground"
                )}
                title={tokenLabel}
              >
                {tokenLabel}
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-baseline gap-2 text-[11px] text-muted-foreground">
            {entry.actorName && <span>{entry.actorName}</span>}
            <span className="font-mono tabular-nums" title={`IP ${entry.ip}`}>
              {displayIP(entry.ip)}
            </span>
          </div>
        </div>
        <ValueDiff entry={entry} />
      </div>
    </li>
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

  // 按时间倒序（最新在前），再按日期分组
  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const result: { day: string; items: { entry: LogEntry; time: string }[] }[] = [];
    for (const entry of sorted) {
      const [day, time = ""] = formatTimestamp(entry.timestamp).split(" ");
      const last = result.at(-1);
      if (last?.day === day) last.items.push({ entry, time });
      else result.push({ day, items: [{ entry, time }] });
    }
    return result;
  }, [entries]);

  const countLabel = isLoading && entries.length === 0
    ? "正在加载…"
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

      <DialogContent className="flex max-h-[min(85dvh,56rem)] flex-col overflow-hidden sm:max-w-4xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>修改日志</DialogTitle>
          <DialogDescription className="flex flex-wrap gap-x-1 text-xs">
            <span>{countLabel}</span>
            {updatedAt && (
              <span className="tabular-nums">
                · 最近更新 {formatTimestamp(updatedAt)}{updatedBy ? ` · ${updatedBy}` : ""}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => void fetchEntries()}>
              重试
            </Button>
          </div>
        )}

        {groups.length > 0 ? (
          <div
            data-testid="change-log-list"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border"
          >
            {groups.map((group) => (
              <section key={group.day}>
                <h3 className="sticky top-0 z-10 border-b bg-muted px-4 py-1.5 font-mono text-[11px] font-medium tabular-nums text-muted-foreground">
                  {group.day}
                </h3>
                <ul className="divide-y">
                  {group.items.map(({ entry, time }) => (
                    <LogEntryRow key={entry.id} entry={entry} time={time} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : error ? null : (
          <div className="flex min-h-0 flex-1 items-center justify-center py-16 text-sm text-muted-foreground">
            {isLoading ? "正在加载…" : "暂无日志记录"}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

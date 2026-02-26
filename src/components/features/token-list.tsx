"use client";

import { useTokenStore } from "@/stores/token-store";
import { ColorSwatch } from "./color-swatch";
import { colorToHex } from "@/lib/contrast";
import { generateTokenCode } from "@/lib/code-generators";
import { cn } from "@/lib/utils";
import { ArrowRight, Copy, Check, GripVertical, Pencil, Palette, Code, Trash2 } from "lucide-react";
import { useState, useCallback, useEffect, useRef, Fragment } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TokenEditPopover } from "./token-edit-popover";
import { syncSampleTokensToFile } from "@/lib/sync-sample-tokens";

const DEFAULT_COLUMN_WIDTHS = [200, 120, 320, 180];
const MIN_COLUMN_WIDTH = 60;
const STORAGE_KEY = "token-list-column-widths";

function loadColumnWidths(): number[] {
  if (typeof window === "undefined") return [...DEFAULT_COLUMN_WIDTHS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_COLUMN_WIDTHS];
    const parsed = JSON.parse(raw) as number[];
    if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((w) => typeof w === "number" && w >= MIN_COLUMN_WIDTH)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return [...DEFAULT_COLUMN_WIDTHS];
}

function saveColumnWidths(widths: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // ignore
  }
}

export function TokenList() {
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);
  const tokens = useTokenStore((s) => s.tokens);
  const activeModeId = useTokenStore((s) => s.activeModeId);
  const selectToken = useTokenStore((s) => s.selectToken);
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);
  const scrollToTokenId = useTokenStore((s) => s.scrollToTokenId);
  const clearScrollTarget = useTokenStore((s) => s.clearScrollTarget);
  const codeFormat = useTokenStore((s) => s.codeFormat);
  const searchQuery = useTokenStore((s) => s.searchQuery);
  const reorderFilteredTokens = useTokenStore((s) => s.reorderFilteredTokens);
  const updateTokenName = useTokenStore((s) => s.updateTokenName);

  const isDragEnabled = !searchQuery.trim();
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<"before" | "after">("after");
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);

  const [columnWidths, setColumnWidths] = useState<number[]>(() => loadColumnWidths());
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);
  const resizeStartRef = useRef({ x: 0, widths: [] as number[] });
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedTokenId ? [selectedTokenId] : [])
  );
  const selectionAnchorRef = useRef<string | null>(selectedTokenId);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroupValue, setEditGroupValue] = useState("");
  const [editGroupTargetIds, setEditGroupTargetIds] = useState<string[]>([]);
  const [editGroupCurrentGroup, setEditGroupCurrentGroup] = useState("");

  const tableMinWidth = columnWidths.reduce((a, b) => a + b, 0);

  const handleResizeStart = useCallback((index: number, clientX: number) => {
    resizeStartRef.current = { x: clientX, widths: [...columnWidths] };
    setResizingIndex(index);
  }, [columnWidths]);

  useEffect(() => {
    if (resizingIndex === null) return;
    const handleMove = (e: MouseEvent) => {
      const { x, widths } = resizeStartRef.current;
      const delta = e.clientX - x;
      const base = widths.length ? widths : columnWidthsRef.current;
      const next = [...base];
      next[resizingIndex] = Math.max(MIN_COLUMN_WIDTH, next[resizingIndex] + delta);
      columnWidthsRef.current = next;
      setColumnWidths(next);
    };
    const handleUp = () => {
      setResizingIndex(null);
      saveColumnWidths(columnWidthsRef.current);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingIndex]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const contextMenuPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stickyShadow, setStickyShadow] = useState(false);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    setStickyShadow((el?.scrollLeft ?? 0) > 0);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll, filteredTokenIds.length]);

  useEffect(() => {
    if (!scrollToTokenId) return;
    const container = scrollRef.current;
    if (!container) return;
    const row = container.querySelector(`[data-token-id="${scrollToTokenId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    clearScrollTarget();
  }, [scrollToTokenId, clearScrollTarget]);

  const handleDragStart = useCallback((tokenId: string) => {
    setDragSourceId(tokenId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, tokenId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverId(tokenId);
    setDropPosition(e.clientY < midY ? "before" : "after");
    setDragOverGroup(null);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragSourceId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  }, []);

  const handleDrop = useCallback(() => {
    if (!dragSourceId || !dragOverId || dragSourceId === dragOverId) {
      setDragSourceId(null);
      setDragOverId(null);
      setDragOverGroup(null);
      return;
    }
    const newIds = filteredTokenIds.filter((id) => id !== dragSourceId);
    const targetIndex = newIds.indexOf(dragOverId);
    const insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
    newIds.splice(insertIndex, 0, dragSourceId);
    reorderFilteredTokens(newIds);
    syncSampleTokensToFile();
    setDragSourceId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  }, [dragSourceId, dragOverId, dropPosition, filteredTokenIds, reorderFilteredTokens]);

  const handleGroupDragOver = useCallback((e: React.DragEvent, groupName: string) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(null);
    setDragOverGroup(groupName);
  }, [isDragEnabled]);

  const handleGroupDragLeave = useCallback((e: React.DragEvent, groupName: string) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverGroup((prev) => (prev === groupName ? null : prev));
    }
  }, []);

  const handleGroupDrop = useCallback((groupName: string) => {
    if (!dragSourceId) return;
    const token = tokens[dragSourceId];
    if (!token) return;

    const targetGroup = groupName === "(root)" ? "" : groupName;
    const leaf = token.path[token.path.length - 1] ?? token.name.split("/").filter(Boolean).pop() ?? token.name;
    const nextName = targetGroup ? `${targetGroup}/${leaf}` : leaf;

    if (nextName !== token.name) {
      updateTokenName(dragSourceId, nextName);
    }

    const newIds = filteredTokenIds.filter((id) => id !== dragSourceId);
    let insertIndex = newIds.length;
    for (let i = newIds.length - 1; i >= 0; i -= 1) {
      const t = tokens[newIds[i]];
      if (t && t.group === targetGroup) {
        insertIndex = i + 1;
        break;
      }
    }
    newIds.splice(insertIndex, 0, dragSourceId);
    reorderFilteredTokens(newIds);
    syncSampleTokensToFile();
    setDragSourceId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  }, [dragSourceId, tokens, filteredTokenIds, updateTokenName, reorderFilteredTokens]);

  useEffect(() => {
    if (selectedTokenId == null) {
      if (selectedIds.size) setSelectedIds(new Set());
      return;
    }
    if (selectedIds.size === 0 || !selectedIds.has(selectedTokenId)) {
      setSelectedIds(new Set([selectedTokenId]));
      selectionAnchorRef.current = selectedTokenId;
    }
  }, [selectedTokenId, selectedIds]);

  useEffect(() => {
    if (!selectedIds.size) return;
    const visible = new Set(filteredTokenIds);
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id);
      else changed = true;
    }
    if (changed) setSelectedIds(next);
  }, [filteredTokenIds, selectedIds]);

  const handleRowSelect = useCallback(
    (tokenId: string, e: React.MouseEvent | React.KeyboardEvent) => {
      if (e.shiftKey && selectionAnchorRef.current) {
        const ids = filteredTokenIds;
        const start = ids.indexOf(selectionAnchorRef.current);
        const end = ids.indexOf(tokenId);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          setSelectedIds(new Set(ids.slice(from, to + 1)));
          selectionAnchorRef.current = tokenId;
          selectToken(tokenId);
          return;
        }
      }
      setSelectedIds(new Set([tokenId]));
      selectionAnchorRef.current = tokenId;
      selectToken(tokenId);
    },
    [filteredTokenIds, selectToken]
  );

  const handleRowContextMenu = useCallback(
    (tokenId: string) => {
      if (!selectedIds.has(tokenId)) {
        setSelectedIds(new Set([tokenId]));
        selectionAnchorRef.current = tokenId;
        selectToken(tokenId);
      }
    },
    [selectedIds, selectToken]
  );

  const handleEditGroup = useCallback(
    (tokenId: string) => {
      const targetIds = selectedIds.has(tokenId) ? Array.from(selectedIds) : [tokenId];
      const base = tokens[tokenId];
      if (!base) return;
      const currentGroup = base.group || "(root)";
      setEditGroupTargetIds(targetIds);
      setEditGroupCurrentGroup(currentGroup);
      setEditGroupValue(currentGroup);
      setEditGroupOpen(true);
    },
    [selectedIds, tokens]
  );

  const handleEditGroupConfirm = useCallback(() => {
    if (!editGroupTargetIds.length) {
      setEditGroupOpen(false);
      return;
    }
    const trimmed = editGroupValue.trim();
    const nextGroup = trimmed === "" || trimmed === "(root)" ? "" : trimmed;
    const currentGroup = editGroupCurrentGroup === "(root)" ? "" : editGroupCurrentGroup;
    if (nextGroup === currentGroup) {
      setEditGroupOpen(false);
      return;
    }

    for (const id of editGroupTargetIds) {
      const t = tokens[id];
      if (!t) continue;
      const leaf = t.path[t.path.length - 1] ?? t.name.split("/").filter(Boolean).pop() ?? t.name;
      const nextName = nextGroup ? `${nextGroup}/${leaf}` : leaf;
      if (nextName !== t.name) updateTokenName(id, nextName);
    }
    syncSampleTokensToFile();
    setEditGroupOpen(false);
  }, [editGroupTargetIds, editGroupValue, editGroupCurrentGroup, tokens, updateTokenName]);

  if (filteredTokenIds.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">没有匹配的令牌</p>
      </div>
    );
  }

  const stickyShadowClass = stickyShadow
    ? "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]"
    : "shadow-[2px_0_4px_-1px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)]";

  const stickyHeaderClass = cn(
    "sticky left-0 z-50 border-b border-r border-border bg-muted",
    stickyShadowClass
  );

  return (
    <div className="min-h-0 min-w-0 flex-1 p-4">
      <div
        ref={scrollRef}
        className="relative h-full overflow-auto rounded-md border border-border"
      >
        <table
          className="table-fixed w-full border-separate border-spacing-0 text-left"
          style={{ minWidth: tableMinWidth }}
        >
          <colgroup>
            {columnWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-40">
            <tr>
              <th className={cn("h-10 relative px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground", stickyHeaderClass)}>
                Token Name
                <ResizeHandle onResizeStart={(e) => handleResizeStart(0, e.clientX)} />
              </th>
              <th className="h-10 relative border-b border-r border-border px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted">
                Value
                <ResizeHandle onResizeStart={(e) => handleResizeStart(1, e.clientX)} />
              </th>
              <th className="h-10 relative border-b border-r border-border px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted">
                Code Syntax
                <ResizeHandle onResizeStart={(e) => handleResizeStart(2, e.clientX)} />
              </th>
              <th className="h-10 relative border-b border-border px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted">
                Reference
              </th>
            </tr>
          </thead>
          <tbody
            className="[&>tr:last-child>td]:border-b-0"
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverId(null);
              }
            }}
          >
            {Array.from(
              (() => {
                const groups = new Map<string, string[]>();
                for (const id of filteredTokenIds) {
                  const token = tokens[id];
                  if (!token) continue;
                  const group = token.group || "(root)";
                  if (!groups.has(group)) groups.set(group, []);
                  groups.get(group)!.push(id);
                }
                // 每组内按 token 名称自然升序排序（如 90 在 100 前）
                for (const ids of groups.values()) {
                  ids.sort((a, b) =>
                    (tokens[a]?.name ?? "").localeCompare(tokens[b]?.name ?? "", undefined, { numeric: true })
                  );
                }
                return groups;
              })()
            ).map(([groupName, tokenIds]) => (
              <Fragment key={groupName}>
                <tr className={cn("bg-muted/60", dragOverGroup === groupName && "bg-primary/10")}>
                  <td
                    colSpan={4}
                    className="h-8 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border"
                    onDragOver={(e) => handleGroupDragOver(e, groupName)}
                    onDragLeave={(e) => handleGroupDragLeave(e, groupName)}
                    onDrop={(e) => { e.preventDefault(); handleGroupDrop(groupName); }}
                  >
                    {groupName}
                  </td>
                </tr>
                {tokenIds.map((id) => {
                  const token = tokens[id];
                  if (!token) return null;
                  const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
                  const resolved = token.resolvedValues[modeId];
                  if (!resolved) return null;

                  const code = generateTokenCode(token, codeFormat, modeId);

                  return (
                    <TokenListRow
                      key={id}
                      tokenId={id}
                      tokenName={token.name}
                      resolved={resolved}
                      code={code}
                      isAlias={token.isAlias}
                      aliasName={token.aliasOf ? tokens[token.aliasOf]?.name : undefined}
                      isSelected={selectedIds.has(id)}
                      stickyShadow={stickyShadow}
                      onSelect={(e) => handleRowSelect(id, e)}
                      onContextMenuSelect={() => handleRowContextMenu(id)}
                      onEditGroup={() => handleEditGroup(id)}
                      contextMenuPositionRef={contextMenuPositionRef}
                      isDragEnabled={isDragEnabled}
                      isDragSource={dragSourceId === id}
                      dropIndicator={dragOverId === id && dragSourceId !== id ? dropPosition : null}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDragEnd={handleDragEnd}
                      onDrop={handleDrop}
                    />
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <TokenEditPopover />
      <Dialog
        open={editGroupOpen}
        onOpenChange={(open) => {
          setEditGroupOpen(open);
          if (!open) {
            setEditGroupTargetIds([]);
            setEditGroupCurrentGroup("");
            setEditGroupValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分组</DialogTitle>
            <DialogDescription>
              {editGroupTargetIds.length > 1
                ? `将 ${editGroupTargetIds.length} 个 Token 移动到新的分组`
                : "更新当前 Token 的分组路径"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              分组路径（使用 / 分隔，留空表示根分组）
            </label>
            <Input
              value={editGroupValue}
              onChange={(e) => setEditGroupValue(e.target.value)}
              placeholder="例如：color/blue"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleEditGroupConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setEditGroupOpen(false)}
            >
              取消
            </Button>
            <Button type="button" onClick={handleEditGroupConfirm}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ResizeHandle({ onResizeStart }: { onResizeStart: (e: React.MouseEvent) => void }) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-label="调整列宽"
      onMouseDown={(e) => {
        e.preventDefault();
        onResizeStart(e);
      }}
      className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize select-none touch-none [-webkit-user-select:none] after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-transparent after:transition-colors hover:after:bg-primary/30"
    />
  );
}

function getValueCopyText(resolved: { type: string; value: unknown }): string {
  if (resolved.type === "COLOR") {
    const color = resolved.value as { r: number; g: number; b: number; a: number };
    return colorToHex(color).toUpperCase();
  }
  if (resolved.type === "NUMBER") return String(resolved.value);
  return String(resolved.value);
}

function TokenListRow({
  tokenId,
  tokenName,
  resolved,
  code,
  isAlias,
  aliasName,
  isSelected,
  stickyShadow,
  onSelect,
  onContextMenuSelect,
  onEditGroup,
  contextMenuPositionRef,
  isDragEnabled,
  isDragSource,
  dropIndicator,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  tokenId: string;
  tokenName: string;
  resolved: { type: string; value: unknown };
  code: string;
  isAlias: boolean;
  aliasName?: string;
  isSelected: boolean;
  stickyShadow: boolean;
  onSelect: (e: React.MouseEvent | React.KeyboardEvent) => void;
  onContextMenuSelect: () => void;
  onEditGroup: () => void;
  contextMenuPositionRef: React.MutableRefObject<{ x: number; y: number }>;
  isDragEnabled: boolean;
  isDragSource: boolean;
  dropIndicator: "before" | "after" | null;
  onDragStart: (tokenId: string) => void;
  onDragOver: (e: React.DragEvent, tokenId: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const setEditingToken = useTokenStore((s) => s.setEditingToken);
  const deleteToken = useTokenStore((s) => s.deleteToken);
  const valueCopyText = getValueCopyText(resolved);
  const dragActivatedRef = useRef(false);
  const displayName = tokenName.split("/").filter(Boolean).pop() ?? tokenName;

  const handleRowDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>) => {
      const pos = { x: e.clientX, y: e.clientY };
      setEditingToken(tokenId, pos);
    },
    [setEditingToken, tokenId]
  );

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
        <div className="flex items-center gap-2 min-w-0">
          <ColorSwatch color={color} size="sm" className="shrink-0" />
          <span className="font-mono text-xs truncate">{colorToHex(color).toUpperCase()}</span>
        </div>
      );
    }
    if (resolved.type === "NUMBER") {
      return <span className="font-mono text-xs">{String(resolved.value)}</span>;
    }
    return <span className="font-mono text-xs truncate">{String(resolved.value)}</span>;
  };

  const cellClass = cn(
    "h-10 px-3 text-left border-b border-r border-border align-middle min-w-0",
    "group-hover:bg-accent/50 transition-colors duration-200 ease",
    isSelected && "bg-accent",
    dropIndicator === "before" && "border-t-2 border-t-primary",
    dropIndicator === "after" && "border-b-2 border-b-primary"
  );

  const stickyCellClass = cn(
    "h-10 px-3 text-left border-b border-r border-border align-middle min-w-0",
    "transition-colors duration-200 ease",
    "sticky left-0 z-20 text-xs font-mono truncate max-w-0",
    isSelected ? "bg-accent" : "bg-background",
    "group-hover:bg-accent",
    stickyShadow
      ? "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]"
      : "shadow-[2px_0_4px_-1px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)]"
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <tr
          data-token-id={tokenId}
          tabIndex={0}
          draggable={isDragEnabled}
          className={cn("group cursor-pointer", isSelected && "bg-accent", isDragSource && "opacity-40")}
          onClick={onSelect}
          onDoubleClick={handleRowDoubleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(e);
            }
          }}
          onContextMenu={(e) => {
            contextMenuPositionRef.current = { x: e.clientX, y: e.clientY };
            onContextMenuSelect();
          }}
          onDragStart={(e) => {
            if (!dragActivatedRef.current) {
              e.preventDefault();
              return;
            }
            dragActivatedRef.current = false;
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", tokenId);
            onDragStart(tokenId);
          }}
          onDragOver={(e) => onDragOver(e, tokenId)}
          onDrop={(e) => { e.preventDefault(); onDrop(); }}
          onDragEnd={onDragEnd}
        >
          <td
            className={cn(
              stickyCellClass,
              dropIndicator === "before" && "border-t-2 border-t-primary",
              dropIndicator === "after" && "border-b-2 border-b-primary"
            )}
          >
            <div className="flex items-center min-w-0">
              {isDragEnabled && (
                <span
                  onPointerDown={() => { dragActivatedRef.current = true; }}
                  onPointerUp={() => { dragActivatedRef.current = false; }}
                  className={cn(
                    "inline-flex items-center justify-center shrink-0 cursor-grab",
                    "w-4 h-4 -ml-1 mr-0.5 text-muted-foreground",
                    "opacity-0 group-hover:opacity-60 transition-opacity duration-200 ease",
                    isDragSource && "opacity-60"
                  )}
                >
                  <GripVertical className="h-3 w-3" />
                </span>
              )}
              <span className="truncate">{displayName}</span>
            </div>
          </td>
          <td className={cellClass}>
            {valueDisplay()}
          </td>
          <td
            className={cn(cellClass, "group/code")}
          >
            <div className="flex items-center gap-1.5">
              <code className="text-[11px] font-mono text-muted-foreground truncate min-w-0 flex-1">
                {code}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 opacity-0 group-hover/code:opacity-100 transition-opacity cursor-pointer p-0.5"
                aria-label="复制代码"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            </div>
          </td>
          <td
            className={cn(cellClass, "text-xs text-muted-foreground truncate border-r-0")}
          >
            {isAlias && aliasName && (
              <span className="flex items-center gap-1 min-w-0">
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="truncate">{aliasName}</span>
              </span>
            )}
          </td>
        </tr>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[160px]">
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => {
            const pos = contextMenuPositionRef.current;
            setEditingToken(tokenId, pos);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑详情
        </ContextMenuItem>
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={onEditGroup}
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑分组
        </ContextMenuItem>
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => navigator.clipboard.writeText(tokenName)}
        >
          <Copy className="h-3.5 w-3.5" />
          复制名称
        </ContextMenuItem>
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => navigator.clipboard.writeText(valueCopyText)}
        >
          <Palette className="h-3.5 w-3.5" />
          复制值
        </ContextMenuItem>
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => navigator.clipboard.writeText(code)}
        >
          <Code className="h-3.5 w-3.5" />
          复制代码
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={() => {
            deleteToken(tokenId);
            syncSampleTokensToFile();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除 Token
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

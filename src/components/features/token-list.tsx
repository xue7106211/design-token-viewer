"use client";

// ============================================================================
// TokenList 组件 — 设计令牌（Design Token）的表格列表视图
//
// 功能概览：
// 1. 以分组表格形式展示所有筛选后的设计令牌
// 2. 支持列宽拖拽调整，并持久化到 localStorage
// 3. 支持行拖拽排序（Drag & Drop），可在行间或分组间移动
// 4. 支持单选 / Shift 多选
// 5. 右键上下文菜单：编辑、复制、删除等操作
// 6. 双击行打开编辑弹窗
// 7. 第一列（Token Name）水平滚动时保持粘性定位
// 8. 分组编辑对话框，可批量修改 Token 的分组路径
// ============================================================================

import { useTokenStore } from "@/stores/token-store";
import { ColorSwatch } from "./color-swatch";
import { colorToHex } from "@/lib/contrast";
import { generateTokenCode } from "@/lib/code-generators";
import { cn } from "@/lib/utils";
import { ArrowRight, Copy, Check, GripVertical, Pencil, Palette, Code, Trash2 } from "lucide-react";
import { useState, useCallback, useEffect, useMemo, useRef, Fragment } from "react";
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

// --- 列宽相关常量 ---
/** 四列的默认宽度：Token Name / Value / Code Syntax / Reference */
const DEFAULT_COLUMN_WIDTHS = [200, 120, 320, 180];
/** 列的最小宽度，防止拖拽时列被压缩到不可见 */
const MIN_COLUMN_WIDTH = 60;
/** localStorage 中保存列宽配置的键名 */
const STORAGE_KEY = "token-list-column-widths";

/**
 * 从 localStorage 加载用户之前保存的列宽配置。
 * 如果数据不存在、格式不合法或处于 SSR 环境，则回退到默认值。
 */
function loadColumnWidths(): number[] {
  // SSR 环境下没有 window，直接返回默认值
  if (typeof window === "undefined") return [...DEFAULT_COLUMN_WIDTHS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_COLUMN_WIDTHS];
    const parsed = JSON.parse(raw) as number[];
    // 校验：必须是长度为 4 的数组，且每个值都是不小于最小宽度的数字
    if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((w) => typeof w === "number" && w >= MIN_COLUMN_WIDTH)) {
      return parsed;
    }
  } catch {
    // JSON 解析失败时静默忽略，回退到默认值
  }
  return [...DEFAULT_COLUMN_WIDTHS];
}

/**
 * 将当前列宽配置持久化到 localStorage。
 * 写入失败时静默忽略（如隐私模式下 localStorage 不可用）。
 */
function saveColumnWidths(widths: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // 写入失败时静默忽略
  }
}

/**
 * TokenList — 主列表组件
 *
 * 从全局 store 中读取筛选后的 Token 列表，按分组渲染为表格。
 * 集成了列宽调整、拖拽排序、多选、右键菜单、分组编辑等交互能力。
 */
export function TokenList() {
  // ---- 从全局 store 中订阅所需状态与操作 ----
  const filteredTokenIds = useTokenStore((s) => s.filteredTokenIds);  // 经过搜索/筛选后的 Token ID 列表
  const tokens = useTokenStore((s) => s.tokens);                      // 所有 Token 的字典 { id -> token }
  const activeModeId = useTokenStore((s) => s.activeModeId);          // 当前激活的模式 ID（如 light/dark）
  const selectToken = useTokenStore((s) => s.selectToken);            // 选中某个 Token 的 action
  const selectedTokenId = useTokenStore((s) => s.selectedTokenId);    // 当前选中的 Token ID（单选）
  const scrollToTokenId = useTokenStore((s) => s.scrollToTokenId);    // 需要滚动到的目标 Token ID
  const clearScrollTarget = useTokenStore((s) => s.clearScrollTarget);// 清除滚动目标
  const codeFormat = useTokenStore((s) => s.codeFormat);              // 代码格式（CSS / SCSS / JS 等）
  const searchQuery = useTokenStore((s) => s.searchQuery);            // 当前搜索关键词
  const reorderFilteredTokens = useTokenStore((s) => s.reorderFilteredTokens); // 重新排序 Token 列表
  const updateTokenName = useTokenStore((s) => s.updateTokenName);    // 更新 Token 名称（含路径）

  // ---- 拖拽排序相关状态 ----
  // 搜索状态下禁用拖拽，因为搜索结果的顺序不应被手动改变
  const isDragEnabled = !searchQuery.trim();
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);       // 正在拖拽的 Token ID
  const [dragOverId, setDragOverId] = useState<string | null>(null);           // 拖拽悬停的目标行 Token ID
  const [dropPosition, setDropPosition] = useState<"before" | "after">("after"); // 放置位置：目标行的上方或下方
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);     // 拖拽悬停的目标分组名

  // ---- 列宽调整相关状态 ----
  const [columnWidths, setColumnWidths] = useState<number[]>(() => loadColumnWidths()); // 从 localStorage 初始化
  const [resizingIndex, setResizingIndex] = useState<number | null>(null);  // 当前正在调整的列索引
  const resizeStartRef = useRef({ x: 0, widths: [] as number[] });          // 拖拽起始位置和初始宽度快照
  const columnWidthsRef = useRef(columnWidths);                              // 用 ref 保持最新值，供事件回调读取
  columnWidthsRef.current = columnWidths;

  // ---- 多选相关状态 ----
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selectedTokenId ? [selectedTokenId] : [])  // 初始化时同步 store 中的单选状态
  );
  const selectionAnchorRef = useRef<string | null>(selectedTokenId); // Shift 多选的锚点（起始行）

  // ---- 分组编辑对话框状态 ----
  const [editGroupOpen, setEditGroupOpen] = useState(false);           // 对话框是否打开
  const [editGroupValue, setEditGroupValue] = useState("");            // 输入框中的分组路径值
  const [editGroupTargetIds, setEditGroupTargetIds] = useState<string[]>([]); // 要修改分组的 Token ID 列表
  const [editGroupCurrentGroup, setEditGroupCurrentGroup] = useState("");     // 当前分组路径（用于对比是否有变化）

  // 表格最小宽度 = 所有列宽之和，确保水平滚动时表格不会被压缩
  const tableMinWidth = columnWidths.reduce((a, b) => a + b, 0);

  /**
   * 列宽拖拽开始：记录鼠标起始 X 坐标和当前列宽快照，
   * 后续 mousemove 事件中通过 delta 计算新宽度。
   */
  const handleResizeStart = useCallback((index: number, clientX: number) => {
    resizeStartRef.current = { x: clientX, widths: [...columnWidths] };
    setResizingIndex(index);
  }, [columnWidths]);

  /**
   * 列宽拖拽过程的副作用：
   * - 监听全局 mousemove 实时更新列宽
   * - 监听 mouseup 结束拖拽并持久化列宽
   * - 拖拽期间设置 cursor 和禁用文本选择，提升体验
   * - 清理函数中移除事件监听并恢复样式
   */
  useEffect(() => {
    if (resizingIndex === null) return;
    const handleMove = (e: MouseEvent) => {
      const { x, widths } = resizeStartRef.current;
      const delta = e.clientX - x; // 鼠标水平位移量
      const base = widths.length ? widths : columnWidthsRef.current;
      const next = [...base];
      // 确保列宽不低于最小值
      next[resizingIndex] = Math.max(MIN_COLUMN_WIDTH, next[resizingIndex] + delta);
      columnWidthsRef.current = next;
      setColumnWidths(next);
    };
    const handleUp = () => {
      setResizingIndex(null);
      saveColumnWidths(columnWidthsRef.current); // 松开鼠标时持久化
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.body.style.cursor = "col-resize";   // 全局光标改为列调整样式
    document.body.style.userSelect = "none";      // 禁止拖拽时选中文本
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizingIndex]);

  // ---- 滚动容器与粘性阴影 ----
  const scrollRef = useRef<HTMLDivElement>(null);                        // 表格外层滚动容器的 ref
  const contextMenuPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 }); // 右键菜单触发时的鼠标坐标
  const [stickyShadow, setStickyShadow] = useState(false);              // 是否显示粘性列的阴影（水平滚动时）

  /** 滚动回调：当水平滚动偏移 > 0 时，为粘性列添加阴影效果 */
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    setStickyShadow((el?.scrollLeft ?? 0) > 0);
  }, []);

  /** 注册/注销滚动事件监听，filteredTokenIds.length 变化时重新绑定 */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    onScroll(); // 初始化时立即检查一次
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll, filteredTokenIds.length]);

  /**
   * 自动滚动到目标 Token 行：
   * 当 store 中设置了 scrollToTokenId 时，找到对应 DOM 行并平滑滚动到可视区域，
   * 然后清除滚动目标，避免重复触发。
   */
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

  // ---- 行级拖拽排序回调 ----

  /** 拖拽开始：记录被拖拽的 Token ID */
  const handleDragStart = useCallback((tokenId: string) => {
    setDragSourceId(tokenId);
  }, []);

  /**
   * 拖拽经过某一行时：
   * - 阻止默认行为以允许 drop
   * - 根据鼠标在行内的垂直位置（上半/下半）决定插入位置
   * - 清除分组级别的拖拽悬停状态
   */
  const handleDragOver = useCallback((e: React.DragEvent, tokenId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverId(tokenId);
    setDropPosition(e.clientY < midY ? "before" : "after");
    setDragOverGroup(null);
  }, []);

  /** 拖拽结束（无论是否成功放置）：重置所有拖拽状态 */
  const handleDragEnd = useCallback(() => {
    setDragSourceId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  }, []);

  /**
   * 行级放置处理：
   * 1. 从当前列表中移除被拖拽的 Token
   * 2. 在目标位置（before/after）插入
   * 3. 更新 store 中的排序并同步到文件
   */
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
    syncSampleTokensToFile(); // 将新顺序持久化到 sample-tokens.json
    setDragSourceId(null);
    setDragOverId(null);
    setDragOverGroup(null);
  }, [dragSourceId, dragOverId, dropPosition, filteredTokenIds, reorderFilteredTokens]);

  // ---- 分组级拖拽回调 ----

  /** 拖拽经过分组标题行时：高亮该分组 */
  const handleGroupDragOver = useCallback((e: React.DragEvent, groupName: string) => {
    if (!isDragEnabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(null);       // 清除行级悬停
    setDragOverGroup(groupName); // 设置分组级悬停
  }, [isDragEnabled]);

  /** 拖拽离开分组标题行时：仅当离开的是当前高亮分组时才清除 */
  const handleGroupDragLeave = useCallback((e: React.DragEvent, groupName: string) => {
    // 检查 relatedTarget 是否仍在当前元素内，避免子元素触发误清除
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverGroup((prev) => (prev === groupName ? null : prev));
    }
  }, []);

  /**
   * 分组级放置处理：将 Token 移动到目标分组
   * 1. 提取 Token 的叶子名称（最后一段路径）
   * 2. 拼接新的完整路径名（targetGroup/leaf）
   * 3. 如果名称有变化则更新
   * 4. 将 Token 插入到目标分组的末尾位置
   */
  const handleGroupDrop = useCallback((groupName: string) => {
    if (!dragSourceId) return;
    const token = tokens[dragSourceId];
    if (!token) return;

    // "(root)" 是 UI 显示用的占位名，实际存储中根分组为空字符串
    const targetGroup = groupName === "(root)" ? "" : groupName;
    // 提取 Token 名称的叶子部分（最后一段路径）
    const leaf = token.path[token.path.length - 1] ?? token.name.split("/").filter(Boolean).pop() ?? token.name;
    const nextName = targetGroup ? `${targetGroup}/${leaf}` : leaf;

    // 仅在名称实际变化时才更新
    if (nextName !== token.name) {
      updateTokenName(dragSourceId, nextName);
    }

    // 将 Token 插入到目标分组中最后一个同组 Token 之后
    const newIds = filteredTokenIds.filter((id) => id !== dragSourceId);
    let insertIndex = newIds.length; // 默认插入到末尾
    for (let i = newIds.length - 1; i >= 0; i -= 1) {
      const t = tokens[newIds[i]];
      if (t && t.group === targetGroup) {
        insertIndex = i + 1; // 找到同组的最后一个，插入其后
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

  // ---- 选择状态同步 ----

  /**
   * 将 store 中的单选状态同步到本地多选集合：
   * - 如果 store 中没有选中项，清空本地选择集合
   * - 如果 store 选中了一个不在本地集合中的项，重置集合为仅包含该项
   */
  useEffect(() => {
    if (selectedTokenId == null) {
      if (selectedIds.size) setSelectedIds(new Set());
      selectionAnchorRef.current = null;
      return;
    }
    if (selectedIds.size === 0 || !selectedIds.has(selectedTokenId)) {
      setSelectedIds(new Set([selectedTokenId]));
      selectionAnchorRef.current = selectedTokenId;
    }
  }, [selectedTokenId, selectedIds]);

  /**
   * 当筛选结果变化时，清理掉已不可见的选中项。
   * 例如用户搜索后，之前选中的 Token 可能已被过滤掉。
   */
  useEffect(() => {
    if (!selectedIds.size) return;
    const visible = new Set(filteredTokenIds);
    let changed = false;
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visible.has(id)) next.add(id);
      else changed = true; // 该项已不在可见列表中
    }
    if (changed) setSelectedIds(next);
  }, [filteredTokenIds, selectedIds]);

  // ---- 分组计算 ----

  /**
   * 将筛选后的 Token 按分组（group）归类。
   * 当允许拖拽排序时保持原顺序；搜索模式下再做组内排序。
   */
  const groupedEntries = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const id of filteredTokenIds) {
      const token = tokens[id];
      if (!token) continue;
      const group = token.group || "(root)";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(id);
    }
    if (!isDragEnabled) {
      // 搜索模式：组内按名称自然排序（numeric: true 使 "color-2" 排在 "color-10" 前面）
      for (const ids of groups.values()) {
        ids.sort((a, b) =>
          (tokens[a]?.name ?? "").localeCompare(tokens[b]?.name ?? "", undefined, { numeric: true })
        );
      }
    }
    return Array.from(groups.entries());
  }, [filteredTokenIds, tokens, isDragEnabled]);

  /** 扁平化的可见 Token ID 列表，用于 Shift 多选时计算范围 */
  const visibleIds = useMemo(
    () => groupedEntries.flatMap(([, ids]) => ids),
    [groupedEntries]
  );

  // ---- 行选择回调 ----

  /**
   * 行点击选择处理：
   * - 按住 Shift 时：从锚点到当前行进行范围多选
   * - 普通点击：单选当前行，并将其设为新的锚点
   */
  const handleRowSelect = useCallback(
    (tokenId: string, e: React.MouseEvent | React.KeyboardEvent) => {
      if (e.shiftKey && selectionAnchorRef.current) {
        // Shift 多选：计算锚点和当前行在可见列表中的索引范围
        const start = visibleIds.indexOf(selectionAnchorRef.current);
        const end = visibleIds.indexOf(tokenId);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          setSelectedIds(new Set(visibleIds.slice(from, to + 1)));
          selectionAnchorRef.current = tokenId;
          selectToken(tokenId);
          return;
        }
      }
      // 普通单选
      setSelectedIds(new Set([tokenId]));
      selectionAnchorRef.current = tokenId;
      selectToken(tokenId);
    },
    [visibleIds, selectToken]
  );

  /**
   * 右键菜单触发时的选择处理：
   * 如果右键的行不在当前选择集合中，则将选择重置为仅该行。
   * 如果已在选择集合中，则保持多选状态不变（支持对多选项执行批量操作）。
   */
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

  // ---- 分组编辑对话框回调 ----

  /**
   * 打开分组编辑对话框：
   * - 如果右键的行在多选集合中，则批量编辑所有选中项的分组
   * - 否则仅编辑当前行的分组
   */
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

  /**
   * 确认分组编辑：
   * 1. 将输入值标准化（空字符串或 "(root)" 都表示根分组）
   * 2. 如果分组没有变化则直接关闭
   * 3. 遍历所有目标 Token，提取叶子名称并拼接新路径
   * 4. 同步到文件并关闭对话框
   */
  const handleEditGroupConfirm = useCallback(() => {
    if (!editGroupTargetIds.length) {
      setEditGroupOpen(false);
      return;
    }
    const trimmed = editGroupValue.trim();
    const nextGroup = trimmed === "" || trimmed === "(root)" ? "" : trimmed;
    const currentGroup = editGroupCurrentGroup === "(root)" ? "" : editGroupCurrentGroup;
    // 分组未变化，无需操作
    if (nextGroup === currentGroup) {
      setEditGroupOpen(false);
      return;
    }

    // 批量更新每个目标 Token 的名称（路径）
    for (const id of editGroupTargetIds) {
      const t = tokens[id];
      if (!t) continue;
      // 提取叶子名称：优先从 path 数组取最后一段，否则从 name 中按 "/" 分割取最后一段
      const leaf = t.path[t.path.length - 1] ?? t.name.split("/").filter(Boolean).pop() ?? t.name;
      const nextName = nextGroup ? `${nextGroup}/${leaf}` : leaf;
      if (nextName !== t.name) updateTokenName(id, nextName);
    }
    syncSampleTokensToFile();
    setEditGroupOpen(false);
  }, [editGroupTargetIds, editGroupValue, editGroupCurrentGroup, tokens, updateTokenName]);

  // ---- 空状态 ----
  // 筛选结果为空时显示提示信息
  if (filteredTokenIds.length === 0) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center p-4 text-center">
        <p className="text-sm text-muted-foreground">没有匹配的令牌</p>
      </div>
    );
  }

  // ---- 粘性列阴影样式 ----
  // 水平滚动时第一列（Token Name）保持粘性定位，通过阴影提示用户存在被遮挡的内容
  const stickyShadowClass = stickyShadow
    ? "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]"
    : "shadow-[2px_0_4px_-1px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)]";

  // 表头第一列的粘性样式（左侧固定 + 阴影）
  const stickyHeaderClass = cn(
    "sticky left-0 z-50 border-b border-r border-border bg-muted",
    stickyShadowClass
  );

  // ---- 主渲染 ----
  return (
    <div className="min-h-0 min-w-0 flex-1 p-4">
      {/* 滚动容器：支持水平和垂直滚动 */}
      <div
        ref={scrollRef}
        className="relative h-full overflow-auto rounded-md border border-border"
      >
        {/* 表格：table-fixed 确保列宽由 colgroup 控制，border-separate 允许独立控制单元格边框 */}
        <table
          className="table-fixed w-full border-separate border-spacing-0 text-left"
          style={{ minWidth: tableMinWidth }}
        >
          {/* 通过 colgroup 精确控制每列宽度 */}
          <colgroup>
            {columnWidths.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>

          {/* 表头：sticky top-0 使其在垂直滚动时保持置顶 */}
          <thead className="sticky top-0 z-40">
            <tr>
              {/* 第一列表头：同时具有 sticky left（水平粘性）和 sticky top（垂直粘性） */}
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
              {/* 最后一列没有 ResizeHandle，因为它会自动填充剩余空间 */}
              <th className="h-10 relative border-b border-border px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted">
                Reference
              </th>
            </tr>
          </thead>

          {/* 表体：按分组渲染，每个分组包含一个标题行和若干数据行 */}
          <tbody
            className="[&>tr:last-child>td]:border-b-0"
            onDragLeave={(e) => {
              // 拖拽离开整个 tbody 时清除行级悬停状态
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverId(null);
              }
            }}
          >
            {groupedEntries.map(([groupName, tokenIds]) => (
              <Fragment key={groupName}>
                {/* 分组标题行：支持拖拽放置以将 Token 移入该分组 */}
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

                {/* 该分组下的所有 Token 行 */}
                {tokenIds.map((id) => {
                  const token = tokens[id];
                  if (!token) return null;
                  // 确定当前模式：优先使用激活的模式，否则取第一个可用模式
                  const modeId = activeModeId ?? Object.keys(token.resolvedValues)[0];
                  const resolved = token.resolvedValues[modeId];
                  if (!resolved) return null;

                  // 根据当前代码格式生成对应的代码片段（CSS var / SCSS / JS 等）
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

      {/* Token 编辑弹窗（双击行或右键"编辑详情"时弹出） */}
      <TokenEditPopover />

      {/* 分组编辑对话框 */}
      <Dialog
        open={editGroupOpen}
        onOpenChange={(open) => {
          setEditGroupOpen(open);
          // 关闭时清理对话框状态
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

/**
 * ResizeHandle — 列宽调整手柄
 *
 * 渲染在每个表头单元格的右侧边缘，用户按下并拖拽即可调整该列宽度。
 * 使用 ::after 伪元素绘制一条细线作为视觉提示，hover 时高亮。
 */
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

/**
 * 根据 Token 的解析值类型，生成用于复制到剪贴板的文本。
 * - COLOR 类型：转换为大写 HEX 格式（如 #FF5733）
 * - NUMBER 类型：直接转为字符串
 * - 其他类型：直接转为字符串
 */
function getValueCopyText(resolved: { type: string; value: unknown }): string {
  if (resolved.type === "COLOR") {
    const color = resolved.value as { r: number; g: number; b: number; a: number };
    return colorToHex(color).toUpperCase();
  }
  if (resolved.type === "NUMBER") return String(resolved.value);
  return String(resolved.value);
}

/**
 * TokenListRow — 单个 Token 的表格行组件
 *
 * 每一行展示一个 Token 的四列信息：名称、值、代码语法、引用关系。
 * 集成了以下交互能力：
 * - 单击选中 / Shift 多选
 * - 双击打开编辑弹窗
 * - 右键上下文菜单（编辑、复制、删除）
 * - 拖拽手柄排序（仅通过 GripVertical 图标触发，避免与文本选择冲突）
 * - 第一列粘性定位（水平滚动时固定在左侧）
 */
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
  tokenId: string;                // Token 唯一标识
  tokenName: string;              // Token 完整名称（含路径，如 "color/primary/500"）
  resolved: { type: string; value: unknown }; // 解析后的值（含类型信息）
  code: string;                   // 生成的代码片段（如 "var(--color-primary-500)"）
  isAlias: boolean;               // 是否为别名 Token
  aliasName?: string;             // 引用的原始 Token 名称
  isSelected: boolean;            // 当前行是否被选中
  stickyShadow: boolean;          // 是否显示粘性列阴影
  onSelect: (e: React.MouseEvent | React.KeyboardEvent) => void;  // 选择回调
  onContextMenuSelect: () => void;  // 右键菜单选择回调
  onEditGroup: () => void;         // 编辑分组回调
  contextMenuPositionRef: React.MutableRefObject<{ x: number; y: number }>; // 右键菜单位置
  isDragEnabled: boolean;          // 是否允许拖拽
  isDragSource: boolean;           // 当前行是否正在被拖拽
  dropIndicator: "before" | "after" | null; // 放置指示器位置
  onDragStart: (tokenId: string) => void;
  onDragOver: (e: React.DragEvent, tokenId: string) => void;
  onDragEnd: () => void;
  onDrop: () => void;
}) {
  const [copied, setCopied] = useState(false);                    // 复制按钮的反馈状态
  const setEditingToken = useTokenStore((s) => s.setEditingToken); // 打开编辑弹窗的 action
  const deleteToken = useTokenStore((s) => s.deleteToken);         // 删除 Token 的 action
  const valueCopyText = getValueCopyText(resolved);                // 预计算的值复制文本
  const dragActivatedRef = useRef(false);                          // 拖拽激活标记（仅通过拖拽手柄激活）
  // 从完整路径中提取叶子名称用于显示（如 "color/primary/500" → "500"）
  const displayName = tokenName.split("/").filter(Boolean).pop() ?? tokenName;

  /** 双击行：在鼠标位置打开 Token 编辑弹窗 */
  const handleRowDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLTableRowElement>) => {
      const pos = { x: e.clientX, y: e.clientY };
      setEditingToken(tokenId, pos);
    },
    [setEditingToken, tokenId]
  );

  /** 复制代码片段到剪贴板，并显示 1.5 秒的成功反馈 */
  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation(); // 阻止冒泡，避免触发行选择
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [code]
  );

  /**
   * 根据 Token 值类型渲染不同的展示组件：
   * - COLOR：色块预览 + HEX 值
   * - NUMBER：数字文本
   * - 其他：字符串文本
   */
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

  // 普通单元格样式：包含选中高亮、悬停效果、拖拽放置指示线
  const cellClass = cn(
    "h-10 px-3 text-left border-b border-r border-border align-middle min-w-0",
    "group-hover:bg-accent/50 transition-colors duration-200 ease",
    isSelected && "bg-accent",
    dropIndicator === "before" && "border-t-2 border-t-primary",
    dropIndicator === "after" && "border-b-2 border-b-primary"
  );

  // 粘性单元格样式（第一列 Token Name）：sticky left-0 + 背景色 + 阴影
  const stickyCellClass = cn(
    "h-10 px-3 text-left border-b border-r border-border align-middle min-w-0",
    "transition-colors duration-200 ease",
    "sticky left-0 z-20 text-xs font-mono truncate max-w-0",
    isSelected ? "bg-accent" : "bg-background", // 选中时使用 accent 背景，否则使用默认背景
    "group-hover:bg-accent",
    stickyShadow
      ? "shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[4px_0_8px_-2px_rgba(0,0,0,0.3)]"
      : "shadow-[2px_0_4px_-1px_rgba(0,0,0,0.04)] dark:shadow-[2px_0_4px_-1px_rgba(0,0,0,0.12)]"
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {/* 表格行：支持键盘导航（tabIndex）、拖拽、选择、双击编辑 */}
        <tr
          data-token-id={tokenId}
          tabIndex={0}
          draggable={isDragEnabled}
          className={cn("group cursor-pointer", isSelected && "bg-accent", isDragSource && "opacity-40")}
          onMouseDown={(e) => {
            if (e.button !== 0) return; // 仅响应左键
            const target = e.target as HTMLElement;
            // 点击拖拽手柄时不触发选择（由拖拽逻辑处理）
            if (target.closest("[data-drag-handle]")) return;
            // 点击交互元素时不触发行选择
            if (target.closest("button, a, input, textarea, select")) return;
            onSelect(e);
          }}
          onDoubleClick={handleRowDoubleClick}
          onKeyDown={(e) => {
            // 支持 Enter / Space 键盘选择（无障碍）
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(e);
            }
          }}
          onContextMenu={(e) => {
            // 记录右键位置，用于定位编辑弹窗
            contextMenuPositionRef.current = { x: e.clientX, y: e.clientY };
            onContextMenuSelect();
          }}
          onDragStart={(e) => {
            // 仅当通过拖拽手柄激活时才允许拖拽，防止普通点击误触发
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
          {/* 第一列：Token 名称（粘性定位） */}
          <td
            className={cn(
              stickyCellClass,
              dropIndicator === "before" && "border-t-2 border-t-primary",
              dropIndicator === "after" && "border-b-2 border-b-primary"
            )}
          >
            <div className="flex items-center min-w-0">
              {/* 拖拽手柄：仅在非搜索状态下显示，hover 时渐显 */}
              {isDragEnabled && (
                <span
                  data-drag-handle
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
              {/* 仅显示叶子名称，完整路径通过分组标题体现 */}
              <span className="truncate">{displayName}</span>
            </div>
          </td>

          {/* 第二列：Token 值（颜色色块 / 数字 / 文本） */}
          <td className={cellClass}>
            {valueDisplay()}
          </td>

          {/* 第三列：代码语法（带复制按钮，hover 时显示） */}
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

          {/* 第四列：引用关系（如果是别名 Token，显示箭头和原始 Token 名称） */}
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

      {/* 右键上下文菜单 */}
      <ContextMenuContent className="min-w-[160px]">
        {/* 编辑详情：在鼠标位置打开编辑弹窗 */}
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
        {/* 编辑分组：打开分组编辑对话框 */}
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={onEditGroup}
        >
          <Pencil className="h-3.5 w-3.5" />
          编辑分组
        </ContextMenuItem>
        {/* 复制 Token 完整名称到剪贴板 */}
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => navigator.clipboard.writeText(tokenName)}
        >
          <Copy className="h-3.5 w-3.5" />
          复制名称
        </ContextMenuItem>
        {/* 复制 Token 值（HEX / 数字等）到剪贴板 */}
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => navigator.clipboard.writeText(valueCopyText)}
        >
          <Palette className="h-3.5 w-3.5" />
          复制值
        </ContextMenuItem>
        {/* 复制代码片段到剪贴板 */}
        <ContextMenuItem
          className="cursor-pointer"
          onSelect={() => navigator.clipboard.writeText(code)}
        >
          <Code className="h-3.5 w-3.5" />
          复制代码
        </ContextMenuItem>
        <ContextMenuSeparator />
        {/* 删除 Token（危险操作，使用 destructive 样式） */}
        <ContextMenuItem
          variant="destructive"
          className="cursor-pointer"
          onSelect={() => {
            deleteToken(tokenId);
            syncSampleTokensToFile(); // 同步删除到文件
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          删除 Token
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

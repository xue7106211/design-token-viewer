import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChangeLogDialog } from "./changelog-dialog";
import type { LogEntry } from "@/types/changelog";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/stores/changelog-store", () => ({
  useChangeLogStore: vi.fn(),
}));

vi.mock("@/stores/token-store", () => ({
  useTokenStore: vi.fn(),
}));

vi.mock("@/lib/changelog", () => ({
  getChangeTypeLabel: vi.fn(),
  formatTimestamp: vi.fn(),
}));

vi.mock("@/lib/contrast", () => ({
  colorToHex: vi.fn(),
}));

vi.mock("colord", () => ({
  colord: vi.fn((value: string) => ({
    isValid: () => value === "red" || value.startsWith("#"),
    toHex: () => (value === "red" ? "#ff0000" : value),
  })),
}));

const { useChangeLogStore } = await import("@/stores/changelog-store");
const { useTokenStore } = await import("@/stores/token-store");
const { getChangeTypeLabel, formatTimestamp } = await import("@/lib/changelog");
const { colorToHex } = await import("@/lib/contrast");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetchEntries = vi.fn();

function setupStore(
  entries: LogEntry[] = [],
  extras: { total?: number; error?: string | null; isLoading?: boolean; documentId?: string } = {}
) {
  (useChangeLogStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: {
      entries: LogEntry[];
      total: number;
      fetchEntries: () => void;
      isLoading: boolean;
      error: string | null;
    }) => unknown) =>
      selector({
        entries,
        total: extras.total ?? entries.length,
        fetchEntries: mockFetchEntries,
        isLoading: extras.isLoading ?? false,
        error: extras.error ?? null,
      })
  );
  (useTokenStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: {
      updatedAt?: number;
      updatedBy?: string;
      activeDocumentId?: string;
      collections: { id: string; name: string; modes: { modeId: string; name: string }[]; tokenIds: string[] }[];
    }) => unknown) =>
      selector({
        activeDocumentId: extras.documentId ?? "hyperos4",
        collections: [
          {
            id: "collection-1",
            name: "Reference",
            modes: [{ modeId: "mode-light", name: "Light" }],
            tokenIds: [],
          },
        ],
      })
  );
}

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: "entry-1",
    timestamp: 1700000000000,
    ip: "192.168.1.1",
    changeType: "update_value",
    tokenId: "token-1",
    tokenName: "primary-color",
    oldValue: "old",
    newValue: "new",
    ...overrides,
  };
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ChangeLogDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchEntries.mockReset();
    (getChangeTypeLabel as ReturnType<typeof vi.fn>).mockImplementation(
      (type: string) => {
        const map: Record<string, string> = {
          update_value: "修改值",
          update_name: "修改名称",
          delete_token: "删除令牌",
          import_document: "导入数据",
        };
        return map[type] ?? type;
      }
    );
    (formatTimestamp as ReturnType<typeof vi.fn>).mockReturnValue(
      "2023-11-14 22:13:20"
    );
    (colorToHex as ReturnType<typeof vi.fn>).mockImplementation(
      (c: { r: number; g: number; b: number }) =>
        `#${Math.round(c.r * 255).toString(16).padStart(2, "0")}${Math.round(c.g * 255).toString(16).padStart(2, "0")}${Math.round(c.b * 255).toString(16).padStart(2, "0")}`
    );
  });

  // 1. 触发按钮渲染
  it("renders trigger button with '日志' text", () => {
    setupStore([]);
    render(<ChangeLogDialog />);
    expect(screen.getByText("日志")).toBeInTheDocument();
  });

  // 2. 点击触发按钮打开弹窗
  it("opens dialog with '修改日志' title when trigger is clicked", () => {
    setupStore([]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));
    expect(screen.getByText("修改日志")).toBeInTheDocument();
  });

  // 3. 日志列表渲染（时间、IP、类型标签）
  it("renders log entries with timestamp, IP, and type label", () => {
    const entries = [
      makeEntry({ id: "e1", changeType: "update_value", tokenName: "color-primary" }),
      makeEntry({ id: "e2", changeType: "update_name", tokenName: "font-size", timestamp: 1700000001000 }),
    ];
    setupStore(entries);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    // 时间戳
    expect(screen.getAllByText("2023-11-14 22:13:20").length).toBeGreaterThanOrEqual(2);
    // IP
    expect(screen.getAllByText("IP: 192.168.1.1").length).toBe(2);
    // 类型标签
    expect(screen.getByText("修改值")).toBeInTheDocument();
    expect(screen.getByText("修改名称")).toBeInTheDocument();
    // Token 名称
    expect(screen.getByText("color-primary")).toBeInTheDocument();
    expect(screen.getByText("font-size")).toBeInTheDocument();
  });

  it("keeps long log lists inside a shrinkable scroll region", () => {
    setupStore(Array.from({ length: 12 }, (_, index) => makeEntry({ id: `entry-${index}` })));
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByRole("dialog")).toHaveClass("h-[85dvh]", "overflow-hidden");
    expect(screen.getByTestId("change-log-list")).toHaveClass("min-h-0", "flex-1");
  });

  // 4. 颜色类型的色块渲染
  it("renders color swatches with backgroundColor for color type entries", () => {
    const entry = makeEntry({
      id: "color-entry",
      changeType: "update_value",
      tokenName: "bg-color",
      oldValue: { r: 1, g: 0, b: 0, a: 1 },
      newValue: { r: 0, g: 0, b: 1, a: 1 },
    });
    setupStore([entry]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    // colorToHex 应被调用来解析颜色值
    expect(colorToHex).toHaveBeenCalled();

    // 查找带有 backgroundColor 内联样式的色块元素
    const dialog = screen.getByRole("dialog");
    const swatches = dialog.querySelectorAll<HTMLElement>(
      "span[style*='background-color']"
    );
    expect(swatches.length).toBeGreaterThanOrEqual(2);
  });

  it("does not offer a control that clears server logs", () => {
    setupStore([makeEntry()]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.queryByText("清空日志")).not.toBeInTheDocument();
    expect(screen.queryByText(/无法恢复/)).not.toBeInTheDocument();
  });

  it("shows a load error and retries without treating it as an empty log", () => {
    setupStore([], { error: "日志加载失败" });
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByText("日志加载失败")).toBeInTheDocument();
    expect(screen.queryByText("暂无日志记录")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(mockFetchEntries).toHaveBeenCalled();
  });

  it("shows the server total when the visible page is truncated", () => {
    setupStore([makeEntry()], { total: 1200 });
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByText("共 1200 条记录，显示最新 1 条")).toBeInTheDocument();
  });

  it("shows the mode name and both sides when only one value is a color", () => {
    setupStore([
      makeEntry({
        changeType: "update_value",
        meta: { modeId: "mode-light" },
        oldValue: { r: 1, g: 0, b: 0, a: 1 },
        newValue: { type: "ALIAS", id: "var_blue" },
      }),
    ]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByText("模式 Light")).toBeInTheDocument();
    expect(screen.getByText("别名 var_blue")).toBeInTheDocument();
  });

  it("keeps ordinary text that happens to be a color name", () => {
    setupStore([
      makeEntry({
        changeType: "update_description",
        oldValue: "red",
        newValue: "按钮文案",
      }),
    ]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByText("red")).toBeInTheDocument();
    expect(screen.getByText("按钮文案")).toBeInTheDocument();
    expect(screen.queryByText("#FF0000")).not.toBeInTheDocument();
  });

  it("shows each moved token name", () => {
    setupStore([
      makeEntry({
        changeType: "move_tokens_to_group",
        tokenName: undefined,
        oldValue: [{ tokenId: "var_a", name: "color/a" }],
        newValue: [{ tokenId: "var_a", name: "moved/a" }],
        meta: { count: 1, targetGroup: "moved" },
      }),
    ]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByText("color/a")).toBeInTheDocument();
    expect(screen.getByText("moved/a")).toBeInTheDocument();
    expect(screen.getByText(/已移动 1 个 Token 至 moved/)).toBeInTheDocument();
  });

  // 7. 空状态显示提示
  it("shows empty state message when no entries", () => {
    setupStore([]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));
    expect(screen.getByText("暂无日志记录")).toBeInTheDocument();
  });

  it("summarizes import document logs instead of rendering full JSON", () => {
    const fullDocument = {
      collections: [{ id: "collection-1" }, { id: "collection-2" }],
      variables: {
        var_1: { name: "color/a" },
        var_2: { name: "color/b" },
        var_3: { name: "color/c" },
      },
    };
    setupStore([
      makeEntry({
        changeType: "import_document",
        oldValue: fullDocument,
        newValue: { label: "导入文档", collections: 3, tokens: 537 },
      }),
    ]);

    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));

    expect(screen.getByText("原文档 · 2 collections · 3 tokens")).toBeInTheDocument();
    expect(screen.getByText("导入文档 · 3 collections · 537 tokens")).toBeInTheDocument();
    expect(screen.queryByText(/"variables"/)).not.toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ChangeLogDialog } from "./changelog-dialog";
import type { LogEntry } from "@/types/changelog";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@/stores/changelog-store", () => ({
  useChangeLogStore: vi.fn(),
}));

vi.mock("@/lib/changelog", () => ({
  getChangeTypeLabel: vi.fn(),
  formatTimestamp: vi.fn(),
}));

vi.mock("@/lib/contrast", () => ({
  colorToHex: vi.fn(),
}));

vi.mock("colord", () => ({
  colord: vi.fn(() => ({ isValid: () => false })),
}));

const { useChangeLogStore } = await import("@/stores/changelog-store");
const { getChangeTypeLabel, formatTimestamp } = await import("@/lib/changelog");
const { colorToHex } = await import("@/lib/contrast");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockClearAll = vi.fn();

function setupStore(entries: LogEntry[] = []) {
  (useChangeLogStore as ReturnType<typeof vi.fn>).mockImplementation(
    (selector: (s: { entries: LogEntry[]; clearAll: () => void }) => unknown) =>
      selector({ entries, clearAll: mockClearAll })
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
    (getChangeTypeLabel as ReturnType<typeof vi.fn>).mockImplementation(
      (type: string) => {
        const map: Record<string, string> = {
          update_value: "修改值",
          update_name: "修改名称",
          delete_token: "删除令牌",
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

  // 5. 清空按钮显示确认对话框
  it("shows confirmation dialog when clear button is clicked", () => {
    setupStore([makeEntry()]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));
    fireEvent.click(screen.getByText("清空日志"));

    // "确认清空"同时出现在标题(h2)和按钮中，用 getAllByText 验证
    const confirmTexts = screen.getAllByText("确认清空");
    expect(confirmTexts.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(/此操作将删除所有日志记录且无法恢复/)
    ).toBeInTheDocument();
  });

  // 6. 确认清空调用 clearAll
  it("calls clearAll when user confirms clear action", () => {
    setupStore([makeEntry()]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));
    fireEvent.click(screen.getByText("清空日志"));

    // 点击确认按钮（注意：确认对话框中的按钮文字也是"确认清空"）
    const confirmButtons = screen.getAllByText("确认清空");
    // 最后一个是确认对话框中的按钮
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  // 7. 空状态显示提示
  it("shows empty state message when no entries", () => {
    setupStore([]);
    render(<ChangeLogDialog />);
    fireEvent.click(screen.getByText("日志"));
    expect(screen.getByText("暂无日志记录")).toBeInTheDocument();
  });
});

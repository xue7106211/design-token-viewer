import type { ReactNode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SnapshotRecord } from "@/lib/collaboration/service";
import { SnapshotDialog } from "./snapshot-dialog";

vi.mock("@/stores/token-store", () => ({
  useTokenStore: vi.fn(),
}));

vi.mock("@/lib/collaboration/client", () => ({
  apiRequest: vi.fn(),
  withActor: vi.fn((input: unknown) => input),
}));

vi.mock("file-saver", () => ({ saveAs: vi.fn() }));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const { useTokenStore } = await import("@/stores/token-store");
const { apiRequest } = await import("@/lib/collaboration/client");

const createdSnapshot: SnapshotRecord = {
  id: "snapshot-1",
  documentId: "hyperos4",
  name: "发布前",
  description: "安全检查点",
  json: {},
  createdBy: "Tester",
  createdAt: 1700000000000,
};

describe("SnapshotDialog save feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const state = { revision: 3, loadRemoteDocument: vi.fn() };
    (useTokenStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (store: typeof state) => unknown) => selector(state)
    );
  });

  it("shows pending and success states without refetching the whole list", async () => {
    let resolveCreate!: (snapshot: SnapshotRecord) => void;
    const createPromise = new Promise<SnapshotRecord>((resolve) => {
      resolveCreate = resolve;
    });

    (apiRequest as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, options?: { method?: string }) =>
        options?.method === "POST"
          ? createPromise
          : Promise.resolve({ snapshots: [] })
    );

    render(<SnapshotDialog />);
    fireEvent.click(screen.getByRole("button", { name: "版本快照" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(1));

    fireEvent.change(within(dialog).getByPlaceholderText("快照名称"), {
      target: { value: "发布前" },
    });
    fireEvent.change(within(dialog).getByPlaceholderText("描述（可选）"), {
      target: { value: "安全检查点" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(within(dialog).getByRole("button", { name: "保存中..." })).toBeDisabled();

    await act(async () => resolveCreate(createdSnapshot));

    expect(await within(dialog).findByRole("button", { name: "已保存" })).toBeInTheDocument();
    expect(within(dialog).getByText("发布前")).toBeInTheDocument();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

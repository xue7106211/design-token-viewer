import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileUpload } from "./file-upload";

vi.mock("@/stores/token-store", () => ({
  useTokenStore: vi.fn(),
}));

const { useTokenStore } = await import("@/stores/token-store");

describe("FileUpload", () => {
  const mockLoadJSON = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTokenStore as ReturnType<typeof vi.fn>).mockImplementation((selector: (s: { loadJSON: () => boolean }) => unknown) =>
      selector({ loadJSON: mockLoadJSON })
    );
  });

  it("renders upload UI with title and drop zone", () => {
    render(<FileUpload />);
    expect(screen.getByText("Design Token Viewer")).toBeInTheDocument();
    expect(screen.getByText(/拖拽 JSON 文件到此处/)).toBeInTheDocument();
    expect(screen.getByText(/加载示例数据/)).toBeInTheDocument();
  });

  it("loads sample data when sample button is clicked", () => {
    mockLoadJSON.mockReturnValue(true);
    render(<FileUpload />);
    fireEvent.click(screen.getByText(/加载示例数据/));
    expect(mockLoadJSON).toHaveBeenCalledTimes(1);
    expect(mockLoadJSON).toHaveBeenCalledWith(expect.any(Object));
  });

  it("shows error when file upload fails", async () => {
    mockLoadJSON.mockReturnValue(false);
    render(<FileUpload />);
    const file = new File(['{"invalid": "format"}'], "test.json", {
      type: "application/json",
    });
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    fireEvent.change(input!, { target: { files: [file] } });
    // jsdom File API may trigger parse error; either message confirms error handling
    const errors = await screen.findAllByText(/无法识别的文件格式|JSON 解析失败/);
    expect(errors.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GroupLabel } from "./group-label";

describe("GroupLabel", () => {
  it("保留原始大小写，父级与末段分开显示", () => {
    const { container } = render(<GroupLabel group="fill/list_item" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.textContent).toBe("fill/list_item");
    expect(root.title).toBe("fill/list_item");
    expect(root.lastElementChild?.textContent).toBe("list_item");
    expect(root.lastElementChild?.className).toContain("text-foreground");
  });

  it("单段分组只显示末段", () => {
    const { container } = render(<GroupLabel group="action_bar" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(1);
    expect(root.textContent).toBe("action_bar");
  });
});

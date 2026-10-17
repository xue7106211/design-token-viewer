import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";

describe("Button press feedback", () => {
  it("uses a subtle press scale with a gentler reduced-motion variant", () => {
    render(<Button>保存</Button>);

    expect(screen.getByRole("button", { name: "保存" })).toHaveClass(
      "active:scale-[0.98]",
      "duration-150",
      "ease-[var(--ease-out)]",
      "motion-reduce:duration-100",
      "motion-reduce:active:scale-[0.99]"
    );
  });
});

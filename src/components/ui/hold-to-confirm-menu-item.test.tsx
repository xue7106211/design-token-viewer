import type { ButtonHTMLAttributes, ReactNode } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOLD_TO_CONFIRM_DURATION_MS,
  HoldToConfirmMenuItem,
} from "./hold-to-confirm-menu-item";

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuItem: ({
    children,
    onSelect,
    variant: _variant,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: ReactNode;
    onSelect?: (event: { preventDefault: () => void }) => void;
    variant?: string;
  }) => (
    <button
      type="button"
      role="menuitem"
      {...props}
      onClick={() => onSelect?.({ preventDefault: vi.fn() })}
    >
      {children}
    </button>
  ),
}));

describe("HoldToConfirmMenuItem", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("confirms only after the full hold duration", () => {
    const onConfirm = vi.fn();
    render(<HoldToConfirmMenuItem onConfirm={onConfirm}>删除</HoldToConfirmMenuItem>);
    const item = screen.getByRole("menuitem");

    fireEvent.pointerDown(item, { button: 0, pointerId: 1 });
    expect(item).toHaveAttribute("data-holding", "true");

    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_DURATION_MS - 1));
    expect(onConfirm).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(item).toHaveAttribute("data-holding", "false");
  });

  it("cancels when the pointer is released early", () => {
    const onConfirm = vi.fn();
    render(<HoldToConfirmMenuItem onConfirm={onConfirm}>删除</HoldToConfirmMenuItem>);
    const item = screen.getByRole("menuitem");

    fireEvent.pointerDown(item, { button: 0, pointerId: 1 });
    act(() => vi.advanceTimersByTime(900));
    fireEvent.pointerUp(item, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_DURATION_MS));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(item).toHaveAttribute("data-holding", "false");
  });

  it("supports deliberate keyboard holds", () => {
    const onConfirm = vi.fn();
    render(<HoldToConfirmMenuItem onConfirm={onConfirm}>删除</HoldToConfirmMenuItem>);
    const item = screen.getByRole("menuitem");

    fireEvent.keyDown(item, { key: "Enter" });
    act(() => vi.advanceTimersByTime(HOLD_TO_CONFIRM_DURATION_MS));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

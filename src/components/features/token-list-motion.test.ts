import { describe, expect, it, vi } from "vitest";
import {
  animateTokenRowReorder,
  captureTokenRowPositions,
} from "./token-list-motion";

function makeRow(tokenId: string, top: number) {
  const row = document.createElement("div");
  row.dataset.tokenId = tokenId;
  let currentTop = top;
  row.getBoundingClientRect = vi.fn(() => ({ top: currentTop }) as DOMRect);
  const animate = vi.fn();
  Object.defineProperty(row, "animate", { value: animate });

  return {
    row,
    animate,
    moveTo(nextTop: number) {
      currentTop = nextTop;
    },
  };
}

describe("token list reorder motion", () => {
  it("animates changed rows from their previous vertical position", () => {
    const root = document.createElement("div");
    const first = makeRow("first", 20);
    const second = makeRow("second", 64);
    root.append(first.row, second.row);
    const previous = captureTokenRowPositions(root);

    first.moveTo(64);
    second.moveTo(20);
    const count = animateTokenRowReorder(root, previous, false);

    expect(count).toBe(2);
    expect(first.animate).toHaveBeenCalledWith(
      [
        { transform: "translateY(-44px)", opacity: 0.85 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 200, easing: "cubic-bezier(0.32, 0.72, 0, 1)" }
    );
  });

  it("keeps only an opacity cue when reduced motion is requested", () => {
    const root = document.createElement("div");
    const row = makeRow("token", 20);
    root.append(row.row);
    const previous = captureTokenRowPositions(root);

    row.moveTo(64);
    animateTokenRowReorder(root, previous, true);

    expect(row.animate).toHaveBeenCalledWith(
      [{ opacity: 0.85 }, { opacity: 1 }],
      { duration: 150, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }
    );
  });
});

export type TokenRowPositions = Map<string, number>;

const ROW_SELECTOR = "[data-token-id]";

export function captureTokenRowPositions(root: HTMLElement): TokenRowPositions {
  const positions: TokenRowPositions = new Map();

  root.querySelectorAll<HTMLElement>(ROW_SELECTOR).forEach((row) => {
    const tokenId = row.dataset.tokenId;
    if (tokenId) positions.set(tokenId, row.getBoundingClientRect().top);
  });

  return positions;
}

export function animateTokenRowReorder(
  root: HTMLElement,
  previousPositions: TokenRowPositions,
  reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
): number {
  let animatedRows = 0;

  root.querySelectorAll<HTMLElement>(ROW_SELECTOR).forEach((row) => {
    const tokenId = row.dataset.tokenId;
    const previousTop = tokenId ? previousPositions.get(tokenId) : undefined;
    if (previousTop === undefined || typeof row.animate !== "function") return;

    const deltaY = previousTop - row.getBoundingClientRect().top;
    if (deltaY === 0) return;

    if (reduceMotion) {
      row.animate([{ opacity: 0.85 }, { opacity: 1 }], {
        duration: 150,
        easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      });
    } else {
      row.animate(
        [
          { transform: `translateY(${deltaY}px)`, opacity: 0.85 },
          { transform: "translateY(0)", opacity: 1 },
        ],
        {
          duration: 200,
          easing: "cubic-bezier(0.32, 0.72, 0, 1)",
        }
      );
    }

    animatedRows += 1;
  });

  return animatedRows;
}

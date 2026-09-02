import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LoadingScreen } from "./loading-screen";

vi.mock("unicode-animations", () => ({
  spinners: {
    braillewave: { frames: ["first"], interval: 80 },
    dna: { frames: ["second"], interval: 80 },
  },
}));

describe("LoadingScreen", () => {
  it("renders the same initial spinner during separate server renders", () => {
    const random = vi.spyOn(Math, "random");

    const firstRender = renderToString(<LoadingScreen />);
    const secondRender = renderToString(<LoadingScreen />);

    expect(firstRender).toBe(secondRender);
    expect(firstRender).toContain("first");
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });
});

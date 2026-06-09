import { describe, expect, it } from "vitest";
import { shouldLoadRemoteDocument } from "./loading-state";

describe("shared token loading state", () => {
  it("does not retry automatically after a load error", () => {
    expect(
      shouldLoadRemoteDocument({
        hasData: false,
        isLoading: false,
        error: "DATABASE_URL is not configured.",
      })
    ).toBe(false);
  });

  it("loads only when empty, idle, and error-free", () => {
    expect(
      shouldLoadRemoteDocument({
        hasData: false,
        isLoading: false,
        error: null,
      })
    ).toBe(true);
  });
});

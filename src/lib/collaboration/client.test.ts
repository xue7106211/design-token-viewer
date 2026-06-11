import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureActor, initializeActorFromIP } from "./client";

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("collaboration actor", () => {
  it("creates an anonymous IP placeholder without prompting", () => {
    const promptSpy = vi.spyOn(window, "prompt");

    const actor = ensureActor();

    expect(promptSpy).not.toHaveBeenCalled();
    expect(actor.actorName).toBe("unknown");
    expect(actor.actorClientId).toBeTruthy();
  });

  it("stores the server detected IP as actor name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ ip: "203.0.113.8" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );

    await initializeActorFromIP();

    expect(ensureActor().actorName).toBe("203.0.113.8");
  });
});

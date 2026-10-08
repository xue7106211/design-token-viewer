import { describe, expect, it, vi } from "vitest";
import type { TokenCollection } from "@/types/token";
import { useChangeLogStore } from "./changelog-store";
import {
  getDefaultCollectionId,
  getHydratedCollectionId,
  sortCollectionsForDocument,
  useTokenStore,
} from "./token-store";

vi.mock("@/lib/collaboration/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/collaboration/client")>(
    "@/lib/collaboration/client"
  );
  return {
    ...actual,
    apiRequest: vi.fn().mockResolvedValue({}),
  };
});

function makeCollection(id: string, name: string): TokenCollection {
  return {
    id,
    name,
    modes: [{ modeId: "light", name: "Light" }],
    tokenIds: [],
  };
}

describe("token-store collection defaults", () => {
  it("sorts HyperOS 4 collections as Component, Semantic, Reference", () => {
    const collections = [
      makeCollection("col_reference", "Reference Token"),
      makeCollection("col_component", "Component Token"),
      makeCollection("col_semantic", "Semantic Token"),
    ];

    expect(sortCollectionsForDocument(collections, "hyperos4").map((collection) => collection.name)).toEqual([
      "Component Token",
      "Semantic Token",
      "Reference Token",
    ]);
  });

  it("defaults HyperOS 4 to Semantic Token", () => {
    expect(getDefaultCollectionId("hyperos4")).toBe("col_semantic");
  });

  it("migrates the old HyperOS 4 Reference default to Semantic", () => {
    expect(getHydratedCollectionId("hyperos4", "col_reference")).toBe("col_semantic");
  });

  it("keeps an explicit non-legacy collection selection", () => {
    expect(getHydratedCollectionId("hyperos4", "col_component")).toBe("col_component");
  });

  it("clears the changelog cache when the active document changes", () => {
    useTokenStore.setState({ activeDocumentId: "hyperos4" });
    useChangeLogStore.setState({
      entries: [
        {
          id: "log-1",
          timestamp: 1,
          ip: "127.0.0.1",
          changeType: "update_value",
        },
      ],
      total: 1,
      epoch: 2,
    });

    useTokenStore.getState().setActiveDocument("hyperos3");

    expect(useChangeLogStore.getState().entries).toEqual([]);
    expect(useChangeLogStore.getState().total).toBe(0);
    expect(useChangeLogStore.getState().epoch).toBe(3);
  });

  it("keeps unknown document collection order unchanged", () => {
    const collections = [
      makeCollection("b", "B"),
      makeCollection("a", "A"),
    ];

    expect(sortCollectionsForDocument(collections, "unknown")).toBe(collections);
  });
});

import { describe, expect, it } from "vitest";
import type { TokenCollection } from "@/types/token";
import {
  getDefaultCollectionId,
  getHydratedCollectionId,
  sortCollectionsForDocument,
} from "./token-store";

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

  it("keeps unknown document collection order unchanged", () => {
    const collections = [
      makeCollection("b", "B"),
      makeCollection("a", "A"),
    ];

    expect(sortCollectionsForDocument(collections, "unknown")).toBe(collections);
  });
});

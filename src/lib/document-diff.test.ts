import { describe, it, expect } from "vitest";
import { diffDocuments } from "./document-diff.mjs";

const modes = [
  { modeId: "m_light", name: "Light" },
  { modeId: "m_dark", name: "Dark" },
];

function doc(variables: Record<string, unknown>, collectionName = "Semantic Token") {
  return {
    collections: [{ id: "c1", name: collectionName, modes, variableIds: Object.keys(variables) }],
    variables,
  };
}

const red = { r: 1, g: 0, b: 0, a: 1 };
const blue = { r: 0, g: 0, b: 1, a: 1 };

describe("diffDocuments", () => {
  it("lists added, removed and changed tokens by collection and name", () => {
    const before = doc({
      a: { id: "a", name: "fill/primary", type: "COLOR", valuesByMode: { m_light: red, m_dark: red } },
      b: { id: "b", name: "fill/old", type: "COLOR", valuesByMode: { m_light: red, m_dark: red } },
    });
    const after = doc({
      x: { id: "x", name: "fill/primary", type: "COLOR", valuesByMode: { m_light: blue, m_dark: red } },
      y: { id: "y", name: "fill/new", type: "COLOR", valuesByMode: { m_light: red, m_dark: red } },
    });

    const result = diffDocuments(before, after);

    expect(result.counts).toEqual({ added: 1, removed: 1, changed: 1 });
    expect(result.added).toEqual(["Semantic Token/fill/new"]);
    expect(result.removed).toEqual(["Semantic Token/fill/old"]);
    expect(result.changed).toEqual([
      { name: "Semantic Token/fill/primary", values: [{ mode: "Light", before: red, after: blue }], fields: [] },
    ]);
  });

  it("compares aliases by target name, not by id", () => {
    const before = doc({
      t: { id: "t", name: "ref/red", type: "COLOR", valuesByMode: { m_light: red, m_dark: red } },
      a: { id: "a", name: "fill/primary", type: "COLOR", valuesByMode: { m_light: { type: "ALIAS", id: "t" }, m_dark: red } },
    });
    const after = doc({
      t2: { id: "t2", name: "ref/red", type: "COLOR", valuesByMode: { m_light: red, m_dark: red } },
      a2: { id: "a2", name: "fill/primary", type: "COLOR", valuesByMode: { m_light: { type: "ALIAS", id: "t2" }, m_dark: red } },
    });

    expect(diffDocuments(before, after).counts).toEqual({ added: 0, removed: 0, changed: 0 });
  });

  it("records metadata-only changes and caps the lists", () => {
    const before = doc({ a: { id: "a", name: "x", type: "NUMBER", valuesByMode: { m_light: 1, m_dark: 1 }, description: "old" } });
    const after = doc({
      a: { id: "a", name: "x", type: "NUMBER", valuesByMode: { m_light: 1, m_dark: 1 }, description: "new" },
      b: { id: "b", name: "y", type: "NUMBER", valuesByMode: { m_light: 1, m_dark: 1 } },
      c: { id: "c", name: "z", type: "NUMBER", valuesByMode: { m_light: 1, m_dark: 1 } },
    });

    const result = diffDocuments(before, after, { limit: 1 });

    expect(result.changed[0]).toMatchObject({ name: "Semantic Token/x", values: [], fields: ["description"] });
    expect(result.counts.added).toBe(2);
    expect(result.added).toHaveLength(1);
  });
});

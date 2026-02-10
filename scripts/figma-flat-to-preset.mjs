#!/usr/bin/env node
/**
 * Converts Figma MCP get_variable_defs output (flat key-value) to the full
 * preset variable format (Collection, Mode, Value, Code syntax placeholders).
 * Preserves native Figma structure for inspection and future plugin export.
 * Usage: node scripts/figma-flat-to-preset.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const HEX_6 = /^#[0-9A-Fa-f]{6}$/;
const HEX_8 = /^#[0-9A-Fa-f]{8}$/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

const COLLECTION_ID = "col_hyperos4";
const MODE_ID = "mode_default";
const MODE_NAME = "Default";

function inferType(value) {
  if (typeof value !== "string") return "STRING";
  if (HEX_6.test(value) || HEX_8.test(value)) return "COLOR";
  if (NUMERIC.test(value)) return "NUMBER";
  return "STRING";
}

function hexToRgba(hex) {
  const h = hex.slice(1);
  if (h.length === 6) {
    return {
      r: parseInt(h.slice(0, 2), 16) / 255,
      g: parseInt(h.slice(2, 4), 16) / 255,
      b: parseInt(h.slice(4, 6), 16) / 255,
      a: 1,
    };
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: parseInt(h.slice(6, 8), 16) / 255,
  };
}

function toFigmaValue(value, type) {
  if (type === "COLOR") return { type: "COLOR", value: hexToRgba(value) };
  if (type === "NUMBER") return { type: "NUMBER", value: parseFloat(value) };
  return { type: "STRING", value: String(value) };
}

const rawPath = join(root, "scripts", "figma-hyperos4-vars.json");
const outPath = join(root, "scripts", "figma-hyperos4-preset.json");

const raw = JSON.parse(readFileSync(rawPath, "utf-8"));
const variableIds = [];
const variables = {};
let index = 0;

for (const [name, value] of Object.entries(raw)) {
  const id = `var_${index++}`;
  variableIds.push(id);
  const type = inferType(value);
  const resolvedType = type === "COLOR" ? "COLOR" : type === "NUMBER" ? "NUMBER" : "STRING";
  variables[id] = {
    id,
    name,
    variableCollectionId: COLLECTION_ID,
    key: "",
    resolvedType,
    type: resolvedType,
    valuesByMode: {
      [MODE_ID]: toFigmaValue(value, type),
    },
    codeSyntax: { WEB: "", ANDROID: "", iOS: "" },
    description: "",
  };
}

const preset = {
  collections: [
    {
      id: COLLECTION_ID,
      name: "Xiaomi Hyper OS4 UI Kit",
      defaultModeId: MODE_ID,
      modes: [{ modeId: MODE_ID, name: MODE_NAME }],
      variableIds,
    },
  ],
  variables,
};

writeFileSync(outPath, JSON.stringify(preset, null, 2), "utf-8");
console.log("Wrote", variableIds.length, "tokens to", outPath);

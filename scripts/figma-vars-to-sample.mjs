#!/usr/bin/env node
/**
 * Converts Figma MCP get_variable_defs output (flat key-value) to Figma native
 * JSON format used by Design Token Viewer (collections + variables).
 * Usage: node scripts/figma-vars-to-sample.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const HEX_6 = /^#[0-9A-Fa-f]{6}$/;
const HEX_8 = /^#[0-9A-Fa-f]{8}$/;
const NUMERIC = /^-?\d+(\.\d+)?$/;

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
  // 8-digit: RRGGBBAA (CSS)
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
const outPath = join(root, "src", "data", "sample-tokens.json");

const raw = JSON.parse(readFileSync(rawPath, "utf-8"));
const variableIds = [];
const variables = {};
let index = 0;
for (const [name, value] of Object.entries(raw)) {
  const id = `var_${index++}`;
  variableIds.push(id);
  const type = inferType(value);
  variables[id] = {
    id,
    name,
    type: type === "COLOR" ? "COLOR" : type === "NUMBER" ? "NUMBER" : "STRING",
    valuesByMode: {
      mode_default: toFigmaValue(value, type),
    },
  };
}

const figmaNative = {
  collections: [
    {
      id: "col_hyperos4",
      name: "Xiaomi Hyper OS4 UI Kit",
      modes: [{ modeId: "mode_default", name: "Default" }],
      variableIds,
    },
  ],
  variables,
};

writeFileSync(outPath, JSON.stringify(figmaNative, null, 2), "utf-8");
console.log("Wrote", variableIds.length, "tokens to", outPath);

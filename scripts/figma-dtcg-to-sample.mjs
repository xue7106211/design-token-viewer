#!/usr/bin/env node
/**
 * Converts Figma W3C DTCG variable exports (figma-token/<Collection>/<Mode>.tokens.json)
 * into the app's Figma-native combined JSON (src/data/sample-tokens-hyperos4.json).
 *
 * Source format (per file = one collection + one mode):
 *   nested groups → leaf token { $type, $value, $extensions }
 *   - color  $value: { components:[r,g,b] (0-1), alpha, hex }
 *   - number $value: number
 *   - alias:  $extensions["com.figma.aliasData"].{targetVariableName, targetVariableSetName}
 *             (references another variable BY NAME within a collection)
 *
 * Output (figma-native):
 *   { collections:[{id,name,modes,variableIds}], variables:{ [id]:{id,name,type,valuesByMode,...} } }
 *
 * Usage: node scripts/figma-dtcg-to-sample.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const tokenDir = join(root, "figma-token");
const outPath = join(root, "src", "data", "sample-tokens-hyperos4.json");

// Collection config. modeId is scoped per collection, so reusing light/dark is fine.
const COLLECTIONS = [
  { name: "Component Token", id: "col_component", dir: "Component Token" },
  { name: "Reference Token", id: "col_reference", dir: "Reference Token" },
  { name: "Semantic Token", id: "col_semantic", dir: "Semantic Token" },
];
const MODES = [
  { file: "Light", modeId: "mode_light", name: "Light" },
  { file: "Dark", modeId: "mode_dark", name: "Dark" },
];

/** Recursively walk DTCG tree, yielding [pathArray, tokenObject] for each leaf with $type. */
function walk(obj, path, cb) {
  if (obj && typeof obj === "object" && "$type" in obj) {
    cb(path, obj);
    return;
  }
  if (obj && typeof obj === "object") {
    for (const k of Object.keys(obj)) walk(obj[k], [...path, k], cb);
  }
}

function colorValue(tok) {
  const v = tok.$value;
  const [r, g, b] = v.components;
  return { type: "COLOR", value: { r, g, b, a: v.alpha ?? 1 } };
}

function rawValue(tok) {
  if (tok.$type === "color") return colorValue(tok);
  if (tok.$type === "number") return { type: "NUMBER", value: tok.$value };
  // Fallback: treat anything else as string
  return { type: "STRING", value: String(tok.$value) };
}

// ---- Pass 1: read every collection/mode, collect token paths + per-mode raw token objects ----
// perColl[collName] = { order: [path...], modes: { modeId: Map<path, tokenObj> } }
const perColl = {};
for (const coll of COLLECTIONS) {
  const order = [];
  const seen = new Set();
  const modes = {};
  for (const mode of MODES) {
    const file = join(tokenDir, coll.dir, `${mode.file}.tokens.json`);
    const json = JSON.parse(readFileSync(file, "utf-8"));
    const map = new Map();
    walk(json, [], (p, tok) => {
      const path = p.join("/");
      map.set(path, tok);
      if (!seen.has(path)) {
        seen.add(path);
        order.push(path);
      }
    });
    modes[mode.modeId] = map;
  }
  perColl[coll.name] = { order, modes };
}

// ---- Assign global ids; build name→id lookup keyed by "collectionName\u0000path" ----
const nameToId = new Map();
const idForCollPath = (collName, path) => nameToId.get(`${collName}\u0000${path}`);
let counter = 0;
for (const coll of COLLECTIONS) {
  for (const path of perColl[coll.name].order) {
    nameToId.set(`${coll.name}\u0000${path}`, `var_${counter++}`);
  }
}

// ---- Pass 2: build variables with valuesByMode, resolving aliases by name ----
const variables = {};
const collectionsOut = [];
let aliasResolved = 0;
const aliasUnresolved = [];

for (const coll of COLLECTIONS) {
  const { order, modes } = perColl[coll.name];
  const variableIds = [];
  for (const path of order) {
    const id = idForCollPath(coll.name, path);
    variableIds.push(id);
    // pick a representative token for type/extensions (prefer Light)
    const repr = modes[MODES[0].modeId].get(path) ?? modes[MODES[1].modeId].get(path);
    const valuesByMode = {};
    for (const mode of MODES) {
      const tok = modes[mode.modeId].get(path);
      if (!tok) continue;
      const alias = tok.$extensions?.["com.figma.aliasData"];
      if (alias && typeof alias.targetVariableName === "string") {
        const targetColl = alias.targetVariableSetName;
        const targetId = idForCollPath(targetColl, alias.targetVariableName);
        if (targetId) {
          valuesByMode[mode.modeId] = { type: "ALIAS", id: targetId };
          aliasResolved++;
          continue;
        }
        aliasUnresolved.push(
          `${coll.name}/${path} [${mode.file}] → ${targetColl}/${alias.targetVariableName}`
        );
        // fall through to raw resolved value
      }
      valuesByMode[mode.modeId] = rawValue(tok);
    }
    variables[id] = {
      id,
      name: path,
      type: repr.$type === "number" ? "NUMBER" : repr.$type === "color" ? "COLOR" : "STRING",
      valuesByMode,
      codeSyntax: {},
    };
  }
  collectionsOut.push({
    id: coll.id,
    name: coll.name,
    modes: MODES.map((m) => ({ modeId: m.modeId, name: m.name })),
    variableIds,
  });
}

const output = { collections: collectionsOut, variables };
writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

const total = Object.keys(variables).length;
console.log(`Wrote ${total} variables across ${collectionsOut.length} collections to ${outPath}`);
collectionsOut.forEach((c) => console.log(`  - ${c.name}: ${c.variableIds.length} tokens`));
console.log(`Aliases resolved: ${aliasResolved}`);
console.log(`Aliases unresolved (fell back to raw value): ${aliasUnresolved.length}`);
aliasUnresolved.slice(0, 20).forEach((u) => console.log(`    ! ${u}`));

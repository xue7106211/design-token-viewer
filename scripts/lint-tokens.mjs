#!/usr/bin/env node
/**
 * 检查一份 Figma Native JSON 或规范快照。退出码 1 表示不能写入。
 *
 *   node scripts/lint-tokens.mjs src/data/sample-tokens-hyperos4.json
 */
import { readFileSync } from "fs";
import { formatTokenLint, lintTokenDocument, partitionTokenLint } from "./lib/token-lint.mjs";

const file = process.argv[2];
if (!file) {
  console.error("用法：node scripts/lint-tokens.mjs <token.json>");
  process.exit(1);
}

const { errors, warnings } = partitionTokenLint(lintTokenDocument(JSON.parse(readFileSync(file, "utf8"))));
if (warnings.length > 0) {
  console.warn(`规范提醒（${warnings.length} 处，不阻止写入）\n${formatTokenLint(warnings)}`);
}
if (errors.length > 0) {
  console.error(formatTokenLint(errors));
  console.error(`规范检查未通过（${errors.length} 处）。不要写入种子、快照、Neon 或 CSV。`);
  process.exit(1);
}

console.log(warnings.length > 0 ? `${file} 规范检查通过，另有 ${warnings.length} 条提醒` : `${file} 规范检查通过`);

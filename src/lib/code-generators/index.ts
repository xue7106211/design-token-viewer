import type { DesignToken, CodeFormat } from "@/types/token";
import { generateCSSToken, generateCSSBlock } from "./css";
import { generateAndroidToken, generateAndroidBlock } from "./android";

export { generateCSSToken, generateCSSBlock } from "./css";
export { generateAndroidToken, generateAndroidBlock } from "./android";

/**
 * Generate code for a single token in the specified format
 */
export function generateTokenCode(
  token: DesignToken,
  format: CodeFormat,
  modeId?: string
): string {
  switch (format) {
    case "css":
      return generateCSSToken(token, modeId);
    case "android":
      return generateAndroidToken(token, modeId);
  }
}

/**
 * Generate code block for multiple tokens
 */
export function generateTokenBlock(
  tokens: DesignToken[],
  format: CodeFormat,
  modeId?: string
): string {
  switch (format) {
    case "css":
      return generateCSSBlock(tokens, modeId);
    case "android":
      return generateAndroidBlock(tokens, modeId);
  }
}

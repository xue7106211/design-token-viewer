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
  modeId?: string,
  tokens?: Record<string, DesignToken>
): string {
  switch (format) {
    case "css":
      return generateCSSToken(token, modeId);
    case "android":
      return generateAndroidToken(token, modeId, tokens);
  }
}

/**
 * Generate code block for multiple tokens
 */
export function generateTokenBlock(
  tokenList: DesignToken[],
  format: CodeFormat,
  modeId?: string,
  tokens?: Record<string, DesignToken>
): string {
  switch (format) {
    case "css":
      return generateCSSBlock(tokenList, modeId);
    case "android":
      return generateAndroidBlock(tokenList, modeId, tokens);
  }
}

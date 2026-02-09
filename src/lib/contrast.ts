import type { ColorValue } from "@/types/token";

/**
 * Calculate relative luminance of a color (WCAG 2.1)
 */
function relativeLuminance(color: ColorValue): number {
  const [rs, gs, bs] = [color.r, color.g, color.b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors (WCAG 2.1)
 * Returns a value between 1 and 21
 */
export function contrastRatio(color1: ColorValue, color2: ColorValue): number {
  const l1 = relativeLuminance(color1);
  const l2 = relativeLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG compliance levels
 */
export function getWCAGLevel(ratio: number): {
  aa: boolean;
  aaLarge: boolean;
  aaa: boolean;
  aaaLarge: boolean;
} {
  return {
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

/**
 * Convert 0-1 color values to hex string
 */
export function colorToHex(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  if (color.a < 1) {
    const a = Math.round(color.a * 255);
    return `${hex}${a.toString(16).padStart(2, "0")}`;
  }
  return hex;
}

/**
 * Convert 0-1 color values to rgb() string
 */
export function colorToRGB(color: ColorValue): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  if (color.a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(2)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert 0-1 color values to HSL string
 */
export function colorToHSL(color: ColorValue): string {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    if (color.a < 1) return `hsla(0, 0%, ${Math.round(l * 100)}%, ${color.a.toFixed(2)})`;
    return `hsl(0, 0%, ${Math.round(l * 100)}%)`;
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  const hDeg = Math.round(h * 360);
  const sPercent = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  if (color.a < 1) {
    return `hsla(${hDeg}, ${sPercent}%, ${lPercent}%, ${color.a.toFixed(2)})`;
  }
  return `hsl(${hDeg}, ${sPercent}%, ${lPercent}%)`;
}

/**
 * Removes leading "group prefix" from code syntax name (e.g. "文字_on_surface_octonary" -> "on_surface_octonary").
 * Matches one or more Chinese characters followed by underscore at the start.
 */
export function stripCodeSyntaxPrefix(name: string): string {
  return name.replace(/^[\u4e00-\u9fff]+_/, "");
}

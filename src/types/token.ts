// ============================================================
// Design Token Viewer — Core Type Definitions
// ============================================================

/** Supported token value types */
export type TokenType =
  | "COLOR"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN";

/** A resolved (final) color value */
export interface ColorValue {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

/** The concrete value of a token in a given mode */
export type TokenValue =
  | { type: "COLOR"; value: ColorValue }
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }
  | { type: "BOOLEAN"; value: boolean };

/** Alias reference — points to another token by id */
export interface AliasReference {
  type: "ALIAS";
  id: string;
}

/** A raw value entry that may be concrete or an alias */
export type RawTokenValue = TokenValue | AliasReference;

/** Represents one design token (unified internal model) */
export interface DesignToken {
  /** Unique identifier */
  id: string;
  /** Full dot-path name, e.g. "color/blue/500" */
  name: string;
  /** Hierarchical path segments, e.g. ["color", "blue", "500"] */
  path: string[];
  /** Token value type */
  type: TokenType;
  /** Collection this token belongs to */
  collection: string;
  /** Group path (all segments except the last), e.g. "color/blue" */
  group: string;
  /** Per-mode raw values (may contain alias refs) */
  rawValues: Record<string, RawTokenValue>;
  /** Per-mode resolved values (aliases fully resolved) */
  resolvedValues: Record<string, TokenValue>;
  /** Whether this token is defined as an alias in any mode */
  isAlias: boolean;
  /** If alias, the target token id (first mode) */
  aliasOf?: string;
  /** Tokens that reference this token (reverse lookup) */
  referencedBy: string[];
  /** Human-readable description */
  description?: string;
}

/** A mode within a collection (e.g. "Light", "Dark") */
export interface TokenMode {
  modeId: string;
  name: string;
}

/** A variable collection (e.g. "Primitives", "Semantic") */
export interface TokenCollection {
  id: string;
  name: string;
  modes: TokenMode[];
  /** Token ids belonging to this collection */
  tokenIds: string[];
}

/** The full parsed result from any format */
export interface ParsedTokenData {
  collections: TokenCollection[];
  tokens: Record<string, DesignToken>;
}

/** Tree node for sidebar navigation */
export interface TokenTreeNode {
  /** Display label for this node */
  label: string;
  /** Full path key */
  path: string;
  /** Child nodes */
  children: TokenTreeNode[];
  /** Token id if this is a leaf node */
  tokenId?: string;
  /** Token type if this is a leaf */
  tokenType?: TokenType;
  /** Number of descendant tokens */
  tokenCount: number;
}

/** View mode in the main panel */
export type ViewMode = "grid" | "list";

/** Code output format */
export type CodeFormat = "css" | "android";

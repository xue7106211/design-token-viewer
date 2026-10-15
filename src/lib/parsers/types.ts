// ============================================================
// Raw Figma JSON format type definitions
// ============================================================

/** Figma native export: color value */
export interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Figma native export: a concrete value in a mode */
export interface FigmaConcreteValue {
  type: "COLOR" | "NUMBER" | "STRING" | "BOOLEAN";
  value: FigmaColor | number | string | boolean;
}

/** Figma native export: an alias reference */
export interface FigmaAliasValue {
  type: "ALIAS";
  id: string;
}

/**
 * Extension (not produced by Figma itself): a composite Text Style value.
 * Each field is a concrete STRING / NUMBER value or an ALIAS to another variable.
 */
export interface FigmaTypographyValue {
  type: "TYPOGRAPHY";
  value: {
    fontFamily: { type: "STRING"; value: string } | FigmaAliasValue;
    fontStyle: { type: "STRING"; value: string } | FigmaAliasValue;
    fontSize: { type: "NUMBER"; value: number } | FigmaAliasValue;
    lineHeight: { type: "NUMBER"; value: number } | FigmaAliasValue;
    letterSpacing?: { type: "NUMBER"; value: number } | FigmaAliasValue;
    paragraphSpacing?: { type: "NUMBER"; value: number } | FigmaAliasValue;
  };
}

export type FigmaValue = FigmaConcreteValue | FigmaTypographyValue | FigmaAliasValue;

export type FigmaVariableType = "COLOR" | "NUMBER" | "STRING" | "BOOLEAN" | "TYPOGRAPHY";

/** Figma Plugin API: code syntax per platform (WEB, ANDROID, iOS) */
export interface FigmaCodeSyntax {
  WEB?: string;
  ANDROID?: string;
  iOS?: string;
}

/** Figma native export: a single variable */
export interface FigmaVariable {
  id: string;
  name: string;
  type: FigmaVariableType;
  description?: string;
  /** Figma variable usage scopes */
  scopes?: string[];
  valuesByMode: Record<string, FigmaValue>;
  /** Import key (Figma Plugin API); optional in JSON export */
  key?: string;
  /** Collection this variable belongs to (Figma Plugin API) */
  variableCollectionId?: string;
  /** Resolved type (Figma Plugin API) */
  resolvedType?: FigmaVariableType;
  /** Code syntax per platform (Figma Plugin API) */
  codeSyntax?: FigmaCodeSyntax;
}

/** Figma native export: a mode */
export interface FigmaMode {
  modeId: string;
  name: string;
}

/** Figma native export: a variable collection */
export interface FigmaCollection {
  id: string;
  name: string;
  modes: FigmaMode[];
  variableIds: string[];
  /** Default mode (Figma Plugin API); optional in JSON export */
  defaultModeId?: string;
  /** Library key (Figma Plugin API); optional in JSON export */
  key?: string;
}

/** Figma native export: top-level JSON structure */
export interface FigmaNativeJSON {
  collections: FigmaCollection[];
  variables: Record<string, FigmaVariable>;
}

// ============================================================
// Variables2CSS plugin format
// ============================================================

export interface V2CSSTokenValue {
  value: string;
  type: string;
  rawValue?: {
    r?: number;
    g?: number;
    b?: number;
    a?: number;
  };
}

export interface V2CSSVariable {
  name: string;
  type: string;
  values: Record<string, V2CSSTokenValue>;
  description?: string;
}

export interface V2CSSCollection {
  name: string;
  modes: string[];
  variables: V2CSSVariable[];
}

export interface Variables2CSSJSON {
  collections: V2CSSCollection[];
}

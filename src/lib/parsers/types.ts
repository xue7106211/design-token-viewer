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

export type FigmaValue = FigmaConcreteValue | FigmaAliasValue;

/** Figma native export: a single variable */
export interface FigmaVariable {
  id: string;
  name: string;
  type: "COLOR" | "NUMBER" | "STRING" | "BOOLEAN";
  description?: string;
  valuesByMode: Record<string, FigmaValue>;
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

// ============================================================
// Design Token Viewer — Core Type Definitions
// 核心类型定义：整个应用内部统一使用的令牌数据模型。
// 各种输入格式 (Figma Native / Variables2CSS) 解析后都会被归一化成这里的类型。
// ============================================================

/** Supported token value types */
// 令牌支持的值类型。联合字面量类型 (union of string literals)：
// 变量只能取这 4 个字符串之一，写错会被编译器拦截。
export type TokenType =
  | "COLOR"
  | "NUMBER"
  | "STRING"
  | "BOOLEAN";

/** A resolved (final) color value */
// 已解析的颜色值。r/g/b/a 均为 0-1 归一化浮点数（与 Figma 一致，而非 0-255）。
export interface ColorValue {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

/** The concrete value of a token in a given mode */
// 令牌在某个 mode 下的「具体值」。这是一个可辨识联合 (discriminated union)：
// 用公共字段 `type` 作为判别标签，TypeScript 能据此自动收窄 `value` 的类型——
// 例如判断 `v.type === "NUMBER"` 后，`v.value` 会被推断为 number。
export type TokenValue =
  | { type: "COLOR"; value: ColorValue }
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }
  | { type: "BOOLEAN"; value: boolean };

/** Alias reference — points to another token by id */
// 别名引用：不直接存值，而是通过 id 指向另一个令牌（如「语义色」引用「基础色」）。
export interface AliasReference {
  type: "ALIAS";
  id: string;
}

/** A raw value entry that may be concrete or an alias */
// 「原始值」= 具体值 或 别名引用。解析前每个 mode 的值都是这种联合类型；
// resolveTokens 会把其中的 ALIAS 递归解析成最终的 TokenValue。
export type RawTokenValue = TokenValue | AliasReference;

/** Represents one design token (unified internal model) */
// 单个设计令牌的统一内部模型——无论来自哪种输入格式，最终都归一成这个结构。
export interface DesignToken {
  /** Unique identifier */
  // 全局唯一 id，别名引用、集合 tokenIds、反向引用都靠它关联。
  id: string;
  /** Full dot-path name, e.g. "color/blue/500" */
  // 完整路径名（用 "/" 分隔），决定树形导航的层级。
  name: string;
  /** Hierarchical path segments, e.g. ["color", "blue", "500"] */
  // name 按 "/" 拆分后的层级数组，便于构建树。
  path: string[];
  /** Token value type */
  type: TokenType;
  /** Collection this token belongs to */
  // 所属集合名称（如 "Reference Token"）。
  collection: string;
  /** Group path (all segments except the last), e.g. "color/blue" */
  // 分组路径 = path 去掉最后一段（叶子名），用于按组聚合展示。
  group: string;
  /** Per-mode raw values (may contain alias refs) */
  // 按 mode 索引的原始值映射，值可能是具体值或别名。key 是 modeId。
  rawValues: Record<string, RawTokenValue>;
  /** Per-mode resolved values (aliases fully resolved) */
  // 按 mode 索引的已解析值，别名已被递归展开为最终 TokenValue。
  resolvedValues: Record<string, TokenValue>;
  /** Whether this token is defined as an alias in any mode */
  // 只要任一 mode 是别名即为 true（用于 UI 标记）。
  isAlias: boolean;
  /** If alias, the target token id (first mode) */
  // 可选字段 (?)：若是别名，记录首个 mode 指向的目标 id。
  aliasOf?: string;
  /** Tokens that reference this token (reverse lookup) */
  // 反向引用：哪些令牌引用了「我」，由 resolveTokens 反向填充，用于查看影响面。
  referencedBy: string[];
  /** Human-readable description */
  description?: string;
  /** Code syntax per platform (Figma: WEB, ANDROID, iOS) */
  // 各平台代码命名（Figma 的 codeSyntax）。导出 Android XML 时优先用 ANDROID 字段。
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
}

/** A mode within a collection (e.g. "Light", "Dark") */
// 集合内的一个模式（如亮色/暗色）。modeId 是机器标识，name 是显示名。
export interface TokenMode {
  modeId: string;
  name: string;
}

/** A variable collection (e.g. "Primitives", "Semantic") */
// 变量集合。一份文档可包含多个集合，每个集合有自己的若干 mode。
export interface TokenCollection {
  id: string;
  name: string;
  modes: TokenMode[];
  /** Token ids belonging to this collection */
  // 该集合包含的令牌 id 列表（数组顺序 = 展示顺序）。
  tokenIds: string[];
}

/** The full parsed result from any format */
// 解析任意输入格式后的统一产物：集合数组 + 全局令牌字典 (id → token)。
export interface ParsedTokenData {
  collections: TokenCollection[];
  tokens: Record<string, DesignToken>;
}

/** Tree node for sidebar navigation */
// 侧边栏树形导航的节点。递归结构：children 里又是 TokenTreeNode。
export interface TokenTreeNode {
  /** Display label for this node */
  label: string;
  /** Full path key */
  path: string;
  /** Child nodes */
  // 子节点；叶子节点此数组为空。
  children: TokenTreeNode[];
  /** Token id if this is a leaf node */
  // 仅叶子节点有值：指向对应令牌。可选 (?)。
  tokenId?: string;
  /** Token type if this is a leaf */
  tokenType?: TokenType;
  /** Number of descendant tokens */
  // 该节点下所有后代令牌的数量（用于在分组旁显示计数）。
  tokenCount: number;
}

/** View mode in the main panel */
// 主面板视图模式：网格 / 列表。
export type ViewMode = "grid" | "list";

/** Code output format */
// 代码导出格式。
export type CodeFormat = "css" | "android";

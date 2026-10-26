// Design Token Viewer — 组件 Token 快速命名：拼接与校验（纯函数）

export const COMP_TOKEN_PREFIX = "miuix_comp";

export const PRESET_COMPONENTS = [
  "menu",
  "button",
  "action_bar",
  "dialog",
  "list",
  "navigator",
  "card",
  "input",
] as const;

export const TOKEN_TYPES = ["color", "radius"] as const;

export const TOKEN_ROLES = ["fill", "bg", "text", "stroke", "mask"] as const;

export const TOKEN_STATES = [
  "enabled",
  "disabled",
  "pressed",
  "selected",
  "checked",
  "activated",
  "hovered",
] as const;

export type CompTokenType = (typeof TOKEN_TYPES)[number];
export type CompTokenRole = (typeof TOKEN_ROLES)[number];
export type CompTokenState = (typeof TOKEN_STATES)[number];

export interface CompTokenNameParts {
  component: string;
  /** 可选；可多段 snake_case，如 secondary_tab */
  part?: string;
  type: CompTokenType | string;
  role: CompTokenRole | string;
  /** 必填；缺省视为空，由校验提示 */
  state?: string;
}

export type CompTokenValidationCode =
  | "not_snake_case"
  | "missing_state"
  | "state_not_last"
  | "part_contains_role"
  | "part_contains_state";

export interface CompTokenValidationIssue {
  code: CompTokenValidationCode;
  message: string;
}

const SNAKE_CASE_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const ROLE_SET = new Set<string>(TOKEN_ROLES);
const STATE_SET = new Set<string>(TOKEN_STATES);

/** 规范化单段输入：去首尾空白，空串视为未填 */
export function normalizeSegment(value: string | undefined | null): string {
  return (value ?? "").trim();
}

/**
 * 拼接组件 Token 名（不含分组前缀）。
 * 结构：miuix_comp_{组件}_{部件?}_{类型}_{角色}_{状态}
 * 缺字段时仍尽量拼接可见部分，便于实时预览；完整合法性由 validate 负责。
 */
export function buildCompTokenName(parts: CompTokenNameParts): string {
  const component = normalizeSegment(parts.component);
  const part = normalizeSegment(parts.part);
  const type = normalizeSegment(parts.type);
  const role = normalizeSegment(parts.role);
  const state = normalizeSegment(parts.state);

  const segments = [COMP_TOKEN_PREFIX];
  if (component) segments.push(component);
  if (part) segments.push(part);
  if (type) segments.push(type);
  if (role) segments.push(role);
  if (state) segments.push(state);

  return segments.join("_");
}

/** Figma 分组路径：{组件}/miuix_comp_… */
export function buildCompTokenPath(parts: CompTokenNameParts): string {
  const component = normalizeSegment(parts.component);
  const name = buildCompTokenName(parts);
  if (!component) return name;
  return `${component}/${name}`;
}

/** 按开关决定预览/复制用的展示串 */
export function formatCompTokenDisplay(
  parts: CompTokenNameParts,
  withGroupPrefix: boolean
): string {
  return withGroupPrefix ? buildCompTokenPath(parts) : buildCompTokenName(parts);
}

function isSnakeCaseSegment(segment: string): boolean {
  return segment.length > 0 && SNAKE_CASE_RE.test(segment);
}

function partSegmentTokens(part: string): string[] {
  return part.split("_").filter(Boolean);
}

/**
 * 校验命名规则。只返回提示列表，不拦截生成/复制。
 * - 必须是小写 snake_case（含完整名与各字段）
 * - 状态必填且必须在最后（中间不得出现状态词）
 * - 部件里不能出现角色词或状态词
 */
export function validateCompTokenName(
  parts: CompTokenNameParts
): CompTokenValidationIssue[] {
  const issues: CompTokenValidationIssue[] = [];
  const component = normalizeSegment(parts.component);
  const part = normalizeSegment(parts.part);
  const type = normalizeSegment(parts.type);
  const role = normalizeSegment(parts.role);
  const state = normalizeSegment(parts.state);
  const name = buildCompTokenName(parts);

  const fieldSegments = [component, ...(part ? [part] : []), type, role, state].filter(
    Boolean
  );
  const hasInvalidCase =
    fieldSegments.some((s) => !isSnakeCaseSegment(s)) ||
    (name.length > 0 && !isSnakeCaseSegment(name));

  if (hasInvalidCase) {
    issues.push({
      code: "not_snake_case",
      message: "必须是小写 snake_case（仅 a-z、0-9 与下划线，不能有大写或连字符）",
    });
  }

  if (!state) {
    issues.push({
      code: "missing_state",
      message: "状态必须放在最后，不能省略",
    });
  } else {
    const nameSegments = name.split("_").filter(Boolean);
    const last = nameSegments[nameSegments.length - 1] ?? "";
    const earlierStateHits = nameSegments
      .slice(0, -1)
      .filter((seg) => STATE_SET.has(seg));
    // 末段不是填写的状态，或名称中间已出现状态词 → 状态没放在最后
    if (last !== state || earlierStateHits.length > 0) {
      issues.push({
        code: "state_not_last",
        message: "状态必须放在名称最后，不能放在中间或其他位置",
      });
    }
  }

  if (part) {
    const tokens = partSegmentTokens(part);
    const roleHits = tokens.filter((t) => ROLE_SET.has(t));
    const stateHits = tokens.filter((t) => STATE_SET.has(t));

    if (roleHits.length > 0) {
      issues.push({
        code: "part_contains_role",
        message: `部件里不能出现角色词（检测到：${roleHits.join(", ")}）`,
      });
    }
    if (stateHits.length > 0) {
      issues.push({
        code: "part_contains_state",
        message: `部件里不能出现状态词（检测到：${stateHits.join(", ")}）`,
      });
    }
  }

  return issues;
}

export const COMP_TOKEN_HISTORY_KEY = "comp-token-namer-history";
export const COMP_TOKEN_HISTORY_LIMIT = 20;

export interface CompTokenHistoryEntry {
  name: string;
  path: string;
  createdAt: number;
}

export function loadCompTokenHistory(
  raw: string | null | undefined
): CompTokenHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CompTokenHistoryEntry =>
          !!item &&
          typeof item === "object" &&
          typeof (item as CompTokenHistoryEntry).name === "string" &&
          typeof (item as CompTokenHistoryEntry).path === "string" &&
          typeof (item as CompTokenHistoryEntry).createdAt === "number"
      )
      .slice(0, COMP_TOKEN_HISTORY_LIMIT);
  } catch {
    return [];
  }
}

/** 将新记录插到最前，同名去重，最多保留 LIMIT 条 */
export function pushCompTokenHistory(
  entries: CompTokenHistoryEntry[],
  next: Omit<CompTokenHistoryEntry, "createdAt"> & { createdAt?: number }
): CompTokenHistoryEntry[] {
  const entry: CompTokenHistoryEntry = {
    name: next.name,
    path: next.path,
    createdAt: next.createdAt ?? Date.now(),
  };
  const rest = entries.filter((e) => e.name !== entry.name || e.path !== entry.path);
  return [entry, ...rest].slice(0, COMP_TOKEN_HISTORY_LIMIT);
}

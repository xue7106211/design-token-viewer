// ============================================================
// Design Token Viewer — 修改日志类型定义
// ============================================================

/** 变更类型 */
export type ChangeType =
  | 'update_value'
  | 'update_name'
  | 'update_description'
  | 'update_code_syntax'
  | 'set_alias'
  | 'delete_token'
  | 'rename_group'
  | 'reorder';

/** 单条日志记录 */
export interface LogEntry {
  /** 唯一 ID（crypto.randomUUID） */
  id: string;
  /** Unix 时间戳（毫秒） */
  timestamp: number;
  /** 操作者 IP */
  ip: string;
  /** 变更类型 */
  changeType: ChangeType;
  /** 被修改 Token 的 ID（delete_token/rename_group/reorder 时可选） */
  tokenId?: string;
  /** 被修改 Token 的名称（用于展示） */
  tokenName?: string;
  /** 修改前的值（JSON 可序列化） */
  oldValue?: unknown;
  /** 修改后的值（JSON 可序列化） */
  newValue?: unknown;
  /** 额外上下文（如 modeId、token type 等） */
  meta?: Record<string, unknown>;
}

// ============================================================
// Design Token Viewer — 修改日志工具函数
// ============================================================

import type { ChangeType } from '@/types/changelog';

export const CHANGE_LOG_PAGE_SIZE = 500;

export function pageByNewest<T extends { timestamp: number; id: string }>(
  entries: T[],
  limit = CHANGE_LOG_PAGE_SIZE,
): { entries: T[]; total: number } {
  const sorted = [...entries].sort((left, right) => {
    if (right.timestamp !== left.timestamp) return right.timestamp - left.timestamp;
    if (left.id === right.id) return 0;
    return left.id < right.id ? 1 : -1;
  });
  const size = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : CHANGE_LOG_PAGE_SIZE;
  return { total: entries.length, entries: sorted.slice(0, size) };
}

/** ChangeType → 中文标签映射 */
const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  update_value: '修改值',
  update_name: '修改名称',
  update_description: '修改描述',
  update_code_syntax: '修改代码语法',
  set_alias: '设置别名',
  delete_token: '删除令牌',
  rename_group: '重命名分组',
  move_tokens_to_group: '移动令牌分组',
  reorder: '重排序',
  restore_snapshot: '恢复快照',
  create_snapshot: '创建快照',
  import_document: '导入数据',
};

/**
 * 获取客户端公网 IP 地址。
 * 调用 https://api.ipify.org?format=json，5 秒超时，失败返回 "unknown"。
 */
export async function fetchClientIP(): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    return data.ip ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 获取 ChangeType 对应的中文标签。
 */
export function getChangeTypeLabel(type: ChangeType): string {
  return CHANGE_TYPE_LABELS[type];
}

/**
 * 格式化 Unix 毫秒时间戳为可读日期时间字符串。
 * 输出格式：`YYYY-MM-DD HH:mm:ss`
 */
export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

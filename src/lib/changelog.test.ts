import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchClientIP, getChangeTypeLabel, formatTimestamp } from '@/lib/changelog';
import type { ChangeType } from '@/types/changelog';

// ---------------------------------------------------------------------------
// 1. getChangeTypeLabel — 8 种 ChangeType 的中文标签映射
// ---------------------------------------------------------------------------
describe('getChangeTypeLabel', () => {
  const cases: [ChangeType, string][] = [
    ['update_value', '修改值'],
    ['update_name', '修改名称'],
    ['update_description', '修改描述'],
    ['update_code_syntax', '修改代码语法'],
    ['set_alias', '设置别名'],
    ['delete_token', '删除令牌'],
    ['rename_group', '重命名分组'],
    ['move_tokens_to_group', '移动令牌分组'],
    ['reorder', '重排序'],
  ];

  it.each(cases)('"%s" → "%s"', (type, expected) => {
    expect(getChangeTypeLabel(type)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// 2. formatTimestamp — 格式化 Unix 毫秒时间戳
// ---------------------------------------------------------------------------
describe('formatTimestamp', () => {
  it('格式化为 YYYY-MM-DD HH:mm:ss', () => {
    // 2024-01-15 08:30:45 UTC
    const ts = Date.UTC(2024, 0, 15, 8, 30, 45);
    const result = formatTimestamp(ts);
    // 由于 formatTimestamp 使用本地时区，我们用 Date 对象验证各部分
    const date = new Date(ts);
    const expected = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-') + ' ' + [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
    ].join(':');
    expect(result).toBe(expected);
  });

  it('月份和日期补零', () => {
    // 2024-03-05 01:02:03 UTC
    const ts = Date.UTC(2024, 2, 5, 1, 2, 3);
    const result = formatTimestamp(ts);
    // 验证格式 YYYY-MM-DD HH:mm:ss
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// 3. fetchClientIP — 成功和失败场景
// ---------------------------------------------------------------------------
describe('fetchClientIP', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('成功获取 IP', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ip: '203.0.113.1' }),
    });

    const ip = await fetchClientIP();
    expect(ip).toBe('203.0.113.1');
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.ipify.org?format=json',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('fetch 抛出异常时返回 "unknown"', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const ip = await fetchClientIP();
    expect(ip).toBe('unknown');
  });

  it('响应中无 ip 字段时返回 "unknown"', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({}),
    });

    const ip = await fetchClientIP();
    expect(ip).toBe('unknown');
  });
});
